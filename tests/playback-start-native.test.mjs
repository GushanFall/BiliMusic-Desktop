import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const rows=JSON.parse(await readFile('tests/fixtures/playback-start.json','utf8'))
const policy=row=>({enabled:row.threshold!==null,thresholdSeconds:row.threshold??0,collection:!!row.collection,durationSeconds:row.listed})

test('Harmony native start policy executes the shared duration and checkpoint cases',async()=>{
 const output=await build({entryPoints:['native/ohos-player/ohos/ResumePolicy.ets'],loader:{'.ets':'ts'},bundle:true,write:false,platform:'node',format:'cjs'})
 const m={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(createRequire(import.meta.url),m,m.exports)
 for(const row of rows)assert.equal(m.exports.playbackStartPosition(row.position,row.duration,row.explicit?undefined:policy(row)),row.expected,row.name)
 assert.equal(m.exports.playbackStartPosition(NaN,120),0)
 assert.throws(()=>m.exports.playbackStartPosition(85,0,{enabled:true,thresholdSeconds:600,collection:false,durationSeconds:0}),/无法读取视频总时长/)
})

test('iOS native start policy compiles and executes the same shared cases',{skip:process.platform!=='darwin'},async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bilimusic-playback-start-'))
 try {
  const cases=rows.map(row=>`precondition(try! playbackStartPosition(${row.position},duration:${row.duration},policy:${row.explicit?'nil':`AutomaticResumePolicy(enabled:${row.threshold!==null},thresholdSeconds:${row.threshold??0},collection:${!!row.collection},durationSeconds:${row.listed})`}) == ${row.expected}, ${JSON.stringify(row.name)})`).join('\n')
  await writeFile(join(folder,'main.swift'),cases+'\nprecondition(try! playbackStartPosition(.nan,duration:120,policy:nil)==0)\ndo { _ = try playbackStartPosition(85,duration:0,policy:AutomaticResumePolicy(enabled:true,thresholdSeconds:600,collection:false,durationSeconds:0)); preconditionFailure("missing duration must preserve checkpoint") } catch ResumePositionError.missingDuration {}\nprint("native resume cases passed")\n')
  const dev='/Applications/Xcode.app/Contents/Developer'
  const sdk=execFileSync('/usr/bin/xcrun',['--sdk','macosx','--show-sdk-path'],{encoding:'utf8',env:{...process.env,DEVELOPER_DIR:dev}}).trim()
  execFileSync(`${dev}/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc`,['-sdk',sdk,'-module-cache-path',join(folder,'cache'),'native/ios-player/ios/Sources/ResumePolicy.swift',join(folder,'main.swift'),'-o',join(folder,'cases')],{cwd:resolve('.'),timeout:60000})
  assert.match(execFileSync(join(folder,'cases'),{encoding:'utf8'}),/native resume cases passed/)
 }finally{await rm(folder,{recursive:true,force:true})}
})
