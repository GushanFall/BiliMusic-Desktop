import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const run=promisify(execFile)
for(const pending of [false,true]) test(`manifest proof verifies exact sources with filing pending=${pending}`, async t=>{
  const dir=await mkdtemp(join(tmpdir(),'bilimusic-manifest-'));t.after(()=>rm(dir,{recursive:true,force:true}))
  const bin=join(dir,'bin');await mkdir(bin)
  const manifest={version:'0.3.4',platforms:[{id:'android-large',sha256:'a'.repeat(64)}]}
  const plan={siteHost:'bilimusic.cn',repos:{github:'owner/repo',gitee:'owner/repo'},manifest}
  const planPath=join(dir,'plan.json'),resultPath=join(dir,'proof.json'),callsPath=join(dir,'calls.jsonl')
  await writeFile(planPath,JSON.stringify(plan))
  await writeFile(join(bin,'curl'),`#!/usr/bin/env node
const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(callsPath)},JSON.stringify(process.argv.slice(2))+'\\n');if(process.argv.at(-1).includes('raw.githubusercontent')&&!process.argv.includes('--noproxy'))process.exit(7);console.log(${JSON.stringify(JSON.stringify(manifest))});`,{mode:0o755})
  await run(process.execPath,[resolve('scripts/verify_release_manifests.mjs'),planPath,resultPath,'b'.repeat(64),...(pending?['filing-pending']:[])],{env:{...process.env,PATH:bin+':'+process.env.PATH}})
  const proof=JSON.parse(await readFile(resultPath,'utf8'))
  assert.equal(proof.planDigest,'b'.repeat(64));assert.equal(proof.results.length,pending?2:3)
  assert.ok(proof.results.every(r=>JSON.stringify(r.manifest)===JSON.stringify(manifest)))
  assert.equal(proof.results.some(r=>r.url.includes('bilimusic.cn')),!pending)
  const calls=(await readFile(callsPath,'utf8')).trim().split('\n').map(JSON.parse)
  assert.ok(calls.some(args=>args.includes('--noproxy')))
})
