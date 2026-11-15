//! Read public playlist metadata only. No playback URLs, login cookies or external plugins.
use super::error::CommandError;
use super::playlist_import::{ExternalPlaylist, ExternalSong, MAX_SONGS, json, limited_body};
use reqwest::{Client, Url};
use serde_json::{Value, json as value};
use std::collections::HashSet;
const MOBILE: &str =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36";
fn text(v: &Value, keys: &[&str]) -> String {
    keys.iter()
        .find_map(|k| {
            v[*k]
                .as_str()
                .filter(|s| !s.is_empty())
                .map(str::to_owned)
                .or_else(|| v[*k].as_u64().map(|n| n.to_string()))
        })
        .unwrap_or_default()
}
fn number(v: &Value, keys: &[&str]) -> usize {
    keys.iter()
        .find_map(|k| {
            v[*k]
                .as_u64()
                .map(|n| n as usize)
                .or_else(|| v[*k].as_str()?.parse().ok())
        })
        .unwrap_or(0)
}
fn error(message: &str) -> CommandError {
    CommandError::provider(message)
}
fn unwrap_data(v: &Value) -> &Value {
    if v["data"].is_object() { &v["data"] } else { v }
}
fn signed(endpoint: &str, params: &[(&str, String)], web: bool, body: &str) -> Url {
    let mut pairs: Vec<_> = params.iter().map(|(k, v)| format!("{k}={v}")).collect();
    pairs.sort();
    let key = if web {
        "NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt"
    } else {
        "OIlwieks28dk2k092lksi2UIkp"
    };
    let signature = format!(
        "{:x}",
        md5::compute(format!("{key}{}{body}{key}", pairs.join("")))
    );
    let mut url = Url::parse(endpoint).unwrap();
    url.query_pairs_mut()
        .extend_pairs(params.iter().map(|(k, v)| (*k, v)))
        .append_pair("signature", &signature);
    url
}
fn kg_params() -> Vec<(&'static str, String)> {
    vec![
        ("appid", "1058".into()),
        ("specialid", "0".into()),
        ("srcappid", "2919".into()),
        ("clientver", "20000".into()),
        ("clienttime", "1586163263991".into()),
        ("mid", "1586163263991".into()),
        ("uuid", "1586163263991".into()),
        ("dfid", "-".into()),
    ]
}
fn kg_list_params(id: &str) -> Vec<(&'static str, String)> {
    let mut p = kg_params();
    if let Some(special) = id.strip_prefix("special:") {
        p.iter_mut().find(|(k, _)| *k == "specialid").unwrap().1 = special.to_owned();
        p.push(("global_specialid", "0".into()))
    } else {
        p.push(("global_specialid", id.to_owned()))
    };
    p
}

async fn kg_json(
    client: &Client,
    endpoint: &str,
    params: &[(&str, String)],
    body: Option<Value>,
    web: bool,
) -> Result<Value, CommandError> {
    let encoded = body.as_ref().map(Value::to_string).unwrap_or_default();
    let url = signed(endpoint, params, web, &encoded);
    let mut req = if body.is_some() {
        client
            .post(url)
            .header("Content-Type", "application/json")
            .body(encoded)
    } else {
        client.get(url)
    };
    req = req
        .header("User-Agent", MOBILE)
        .header("Referer", "https://m.kugou.com/")
        .header("mid", "1586163263991")
        .header("dfid", "-")
        .header("clienttime", "1586163263991");
    let response = req
        .send()
        .await
        .map_err(|_| error("酷狗歌单连接失败，请稍后重试"))?;
    if !response.status().is_success() {
        return Err(error("酷狗歌单服务暂不可用，请稍后重试"));
    }
    let result: Value = serde_json::from_slice(&limited_body(response).await?)
        .map_err(|_| error("酷狗歌单返回异常，请重试"))?;
    if number(&result, &["errcode", "err_code", "error_code"]) != 0
        || result["status"].as_i64() == Some(0)
    {
        return Err(error("无法读取这份酷狗歌单，请确认分享公开且有效"));
    }
    Ok(result)
}
fn song(source: &str, v: &Value) -> Option<ExternalSong> {
    let (mut title, mut artists, id, duration, album, cover) = match source {
        "kugou" => {
            let filename = text(v, &["filename", "name", "songname"]);
            let (artist, title) = filename
                .split_once(" - ")
                .map(|(a, t)| (a.to_owned(), t.to_owned()))
                .unwrap_or((String::new(), filename));
            (
                title,
                vec![artist],
                text(v, &["hash", "mixsongid"]),
                number(v, &["duration"]) as f64,
                text(v, &["album_name"]),
                text(v, &["cover", "imgurl"]),
            )
        }
        "kuwo" => (
            text(v, &["name", "SONGNAME"]),
            vec![text(v, &["artist", "ARTIST"])],
            text(v, &["id", "rid", "MUSICRID"]),
            number(v, &["duration", "DURATION"]) as f64,
            text(v, &["album", "ALBUM"]),
            text(v, &["pic", "albumpic"]),
        ),
        _ => (
            text(v, &["songName"]),
            v["singerList"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(|s| s["name"].as_str().map(str::to_owned))
                .collect(),
            text(v, &["songId", "copyrightId"]),
            number(v, &["duration"]) as f64,
            text(v, &["album"]),
            text(v, &["img3", "img2", "img1"]),
        ),
    };
    title = title.trim().to_owned();
    artists.retain(|a| !a.trim().is_empty());
    if title.is_empty() || id.is_empty() {
        return None;
    }
    Some(ExternalSong {
        source_id: format!("{source}:{id}"),
        title,
        artists,
        aliases: vec![],
        duration_seconds: duration,
        album: (!album.is_empty()).then_some(album),
        cover_url: (!cover.is_empty()).then(|| {
            cover
                .replace("{size}", "240")
                .replacen("http://", "https://", 1)
        }),
    })
}
fn append_page(
    source: &str,
    items: &[Value],
    songs: &mut Vec<ExternalSong>,
    seen: &mut HashSet<String>,
) -> Result<bool, CommandError> {
    if items.is_empty() {
        return Ok(false);
    }
    let before = seen.len();
    for item in items {
        if let Some(song) = song(source, item) {
            if seen.insert(song.source_id.clone()) {
                songs.push(song);
            }
        }
    }
    if songs.len() > MAX_SONGS {
        return Err(CommandError::validation("一次最多导入 5000 首，请分批导入"));
    }
    if seen.len() == before {
        return Err(error("歌单分页读取中断，未保存不完整结果，请重试"));
    }
    Ok(true)
}

pub(super) async fn read(
    client: &Client,
    source: &str,
    id: &str,
) -> Result<ExternalPlaylist, CommandError> {
    let mut id = id.to_owned();
    let mut name = String::new();
    let mut reported = 0;
    if source == "kugou" {
        if id.starts_with("gcid_") {
            let params = vec![
                ("dfid", "-".into()),
                ("appid", "1005".into()),
                ("mid", "0".into()),
                ("clientver", "20109".into()),
                ("clienttime", "640612895".into()),
                ("uuid", "-".into()),
            ];
            let result = kg_json(
                client,
                "https://t.kugou.com/v1/songlist/batch_decode",
                &params,
                Some(value!({"ret_info":1,"data":[{"id":id,"id_type":2}]})),
                false,
            )
            .await?;
            id = text(&unwrap_data(&result)["list"][0], &["global_collection_id"]);
            if id.is_empty() {
                return Err(error("酷狗分享链接已失效，请重新分享歌单"));
            }
        }
        let p = kg_list_params(&id);
        let r = kg_json(
            client,
            "https://mobiles.kugou.com/api/v5/special/info_v2",
            &p,
            None,
            true,
        )
        .await?;
        let d = unwrap_data(&r);
        name = text(d, &["specialname", "name"]);
        reported = number(d, &["songcount", "count"]);
    } else if source == "migu" {
        let url = Url::parse_with_params(
            "https://c.musicapp.migu.cn/MIGUM3.0/resource/playlist/v2.0",
            &[("playlistId", id.as_str())],
        )
        .unwrap();
        let r = json(client, url, "https://m.music.migu.cn/").await?;
        name = text(&r["data"], &["title"]);
    }
    let mut songs = Vec::new();
    let mut seen = HashSet::new();
    let mut received = 0;
    for page in 1..=101 {
        let r = match source {
            "kugou" => {
                let mut p = kg_list_params(&id);
                p.extend([("page", page.to_string()), ("pagesize", "100".into())]);
                kg_json(
                    client,
                    "https://mobiles.kugou.com/api/v5/special/song_v2",
                    &p,
                    None,
                    true,
                )
                .await?
            }
            "kuwo" => {
                let url = Url::parse_with_params(
                    "https://nplserver.kuwo.cn/pl.svc",
                    &[
                        ("op", "getlistinfo"),
                        ("pid", id.as_str()),
                        ("pn", &(page - 1).to_string()),
                        ("rn", "100"),
                        ("encode", "utf8"),
                        ("keyset", "pl2012"),
                        ("identity", "kuwo"),
                        ("pcmp4", "1"),
                        ("newver", "1"),
                    ],
                )
                .unwrap();
                json(client, url, "https://www.kuwo.cn/").await?
            }
            _ => {
                let url = Url::parse_with_params(
                    "https://app.c.nf.migu.cn/MIGUM3.0/resource/playlist/song/v2.0",
                    &[
                        ("playlistId", id.as_str()),
                        ("pageNo", &page.to_string()),
                        ("pageSize", "50"),
                    ],
                )
                .unwrap();
                json(client, url, "https://m.music.migu.cn/").await?
            }
        };
        let d = unwrap_data(&r);
        let (items, total) = match source {
            "kugou" => (d["info"].as_array(), number(d, &["total"])),
            "kuwo" => {
                if r["result"].as_str() != Some("ok") {
                    return Err(error("无法读取酷我歌单，请确认歌单已公开"));
                }
                if name.is_empty() {
                    name = text(&r, &["title"])
                }
                (r["musiclist"].as_array(), number(&r, &["total"]))
            }
            _ => {
                if r["code"].as_str() != Some("000000") {
                    return Err(error("咪咕歌单服务暂不可用，请稍后重试"));
                }
                (d["songList"].as_array(), number(d, &["totalCount"]))
            }
        };
        let items = items.ok_or_else(|| error("歌单内容不完整，请稍后重试"))?;
        reported = reported.max(total);
        if reported > MAX_SONGS {
            return Err(CommandError::validation("一次最多导入 5000 首，请分批导入"));
        }
        #[cfg(test)]
        eprintln!(
            "{source} page={page} items={} total={total} received={received}",
            items.len()
        );
        received += items.len();
        if !append_page(source, items, &mut songs, &mut seen)? || total > 0 && songs.len() >= total
        {
            break;
        }
        if page == 101 {
            return Err(error("歌单分页过多，请分批导入"));
        }
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
    }
    if songs.is_empty() {
        return Err(error("这份歌单为空或未公开，请检查分享链接"));
    }
    Ok(ExternalPlaylist {
        name: if name.is_empty() {
            "导入的歌单".into()
        } else {
            name
        },
        source: source.into(),
        reported_count: reported.max(songs.len()),
        unavailable_count: reported.saturating_sub(songs.len()),
        songs,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn paging_deduplicates_overlap_but_rejects_a_repeated_last_page() {
        let item = |id| value!({"id":id,"name":"歌名","artist":"歌手"});
        let mut songs = Vec::new();
        let mut seen = HashSet::new();
        assert!(append_page("kuwo", &[item(1), item(2)], &mut songs, &mut seen).unwrap());
        assert!(append_page("kuwo", &[item(2), item(3)], &mut songs, &mut seen).unwrap());
        assert_eq!(
            songs
                .iter()
                .map(|s| s.source_id.as_str())
                .collect::<Vec<_>>(),
            vec!["kuwo:1", "kuwo:2", "kuwo:3"]
        );
        assert!(append_page("kuwo", &[item(2), item(3)], &mut songs, &mut seen).is_err());
        assert!(!append_page("kuwo", &[], &mut songs, &mut seen).unwrap());
    }
    #[test]
    fn page_limits_count_unique_readable_songs() {
        let items: Vec<_> = (0..MAX_SONGS)
            .map(|id| value!({"id":id,"name":"歌名"}))
            .collect();
        let mut songs = Vec::new();
        let mut seen = HashSet::new();
        assert!(append_page("kuwo", &items, &mut songs, &mut seen).unwrap());
        assert!(
            append_page(
                "kuwo",
                &[value!({"id":MAX_SONGS,"name":"另一首"})],
                &mut songs,
                &mut seen
            )
            .is_err()
        );
    }
    #[test]
    fn platform_metadata_preserves_identity_and_ordering_keys() {
        let kg = song(
            "kugou",
            &value!({"filename":"歌手 - 歌名 - Live","hash":"A","duration":200}),
        )
        .unwrap();
        assert_eq!(kg.title, "歌名 - Live");
        assert_eq!(kg.artists, vec!["歌手"]);
        let kw = song(
            "kuwo",
            &value!({"name":"歌名","artist":"甲","id":"MUSIC_1","duration":"120"}),
        )
        .unwrap();
        assert_eq!(kw.duration_seconds, 120.0);
        let mg = song(
            "migu",
            &value!({"songName":"歌名","songId":"1","singerList":[{"name":"甲"}]}),
        )
        .unwrap();
        assert_eq!(mg.artists, vec!["甲"]);
        assert!(song("migu", &value!({"songName":""})).is_none());
    }
}
