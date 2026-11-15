import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
const result=await build({entryPoints:['src/services/bilibiliMetadata.ts'],bundle:true,write:false,format:'esm',platform:'node'})
const {originalBilibiliMetadata}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)
const track={source:{provider:'bilibili',bvid:'BVtest',cid:2},title:'修改过的名称',artist:'修改过的歌手',album:'修改过的专辑'}
const part={cid:2,page:1,title:'P1',durationSeconds:120,coverUrl:''}
const detail={bvid:'BVtest',title:'当前视频名称',coverUrl:'https://example.com/bv.jpg',uploaderName:'UP 主',parts:[part]}
test('restoring original metadata uses the BV name for single-P and clears external artist/album',()=>{
 assert.deepEqual(originalBilibiliMetadata(track,detail),{title:'当前视频名称',artist:'',album:'',coverUrl:detail.coverUrl})
})
test('multi-P restoration follows the exact CID and the current part cover',()=>{
 const multi={...detail,parts:[{...part,cid:1,title:'第一首'},{...part,title:'第二首',coverUrl:'https://example.com/part.jpg'}]}
 assert.deepEqual(originalBilibiliMetadata(track,multi),{title:'第二首',artist:'',album:'',coverUrl:'https://example.com/part.jpg'})
 assert.throws(()=>originalBilibiliMetadata(track,{...detail,parts:[{...part,cid:1}]}),/分 P 已移除/)
 assert.throws(()=>originalBilibiliMetadata(track,{...detail,bvid:'BVother'}),/信息不一致/)
})
