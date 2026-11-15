// Verify the exact URLs used by installed clients from the publishing workstation.
import { readFile, writeFile, rename } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify, isDeepStrictEqual } from 'node:util'
const run = promisify(execFile)
const [planPath, reportPath, planDigest, pending] = process.argv.slice(2)
if (!planPath || !reportPath || !/^[a-f0-9]{64}$/.test(planDigest || '')) throw Error('Expected plan, report and plan digest')
const plan = JSON.parse(await readFile(planPath, 'utf8'))
const urls = [
  ...(!pending ? [`https://${plan.siteHost}/api/v1/releases`] : []),
  `https://gitee.com/${plan.repos.gitee}/raw/main/website/releases.json`,
  `https://raw.githubusercontent.com/${plan.repos.github}/main/website/releases.json`,
]
async function check(url) {
  for (let attempt=0; attempt<20; attempt++) {
    for (const direct of [false,true]) {
      try {
        const {stdout} = await run('curl', ['--fail','--silent','--location','--max-time','15',...(direct?['--noproxy','*']:[]),url], {maxBuffer:1024*1024,timeout:17000})
        const manifest=JSON.parse(stdout)
        if (isDeepStrictEqual(manifest,plan.manifest)) return {url,manifest}
      } catch { /* Retry through the other route, then wait for CDN freshness. */ }
    }
    if(attempt<19) await new Promise(resolve=>setTimeout(resolve,2000))
  }
  throw Error('Public update manifest unavailable or stale: '+url)
}
const results=await Promise.all(urls.map(check))
await writeFile(reportPath+'.tmp',JSON.stringify({planDigest,results,verifiedAt:new Date().toISOString()},null,2)+'\n')
await rename(reportPath+'.tmp',reportPath)
console.log(JSON.stringify({stage:'publicManifests',status:'verified',sources:results.length}))
