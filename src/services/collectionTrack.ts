import { sourceTitle } from './sourceTitle'
import type { Track } from '../domain/track'
import type { BiliVideoParts } from './desktopApi'

export function toTrack(detail: BiliVideoParts, part: BiliVideoParts['parts'][number]): Track {
  return {
    id: `bilibili:${detail.bvid}:${part.cid}`,
    source: { provider: 'bilibili', bvid: detail.bvid, aid: detail.aid || undefined, cid: part.cid, page: part.page, uploaderId: detail.uploaderId, uploaderName: detail.uploaderName },
    title: sourceTitle(detail.title, part.title, detail.parts.length, Boolean(detail.season || detail.chapterContext)),
    displayTitle: sourceTitle(detail.title, part.title, detail.parts.length, Boolean(detail.season || detail.chapterContext)),
    videoTitle: detail.title,
    publishedAt: detail.publishedAt,
    partCount: detail.parts.length,
    chapterContext: Boolean(detail.season || detail.chapterContext),
    coverUrl: part.coverUrl || detail.coverUrl,
    durationSeconds: part.durationSeconds,
    liked: false,
  }
}
