import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
const text=(await build({entryPoints:['src/services/sourceTitle.ts'],bundle:true,write:false,format:'esm'})).outputFiles[0].text
const {sourceTitle}=await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)
test('chapter titles are consistent for single-P season members and multi-P videos',()=>{
 assert.equal(sourceTitle('长 BV 标题','四、周旋权臣',1,true),'四、周旋权臣')
 assert.equal(sourceTitle('普通视频','不同的P1名称',1,false),'普通视频')
 for(const title of ['','   ','P1','part 1','正片','视频','默认标题'])assert.equal(sourceTitle('BV 标题',title,1,true),'BV 标题')
 assert.equal(sourceTitle('BV 标题','第二章',2,false),'第二章')
})
test('shared track conversion uses season membership without changing BV/CID identity',async()=>{
 const code=(await build({entryPoints:['src/services/collectionTrack.ts'],bundle:true,write:false,format:'esm'})).outputFiles[0].text
 const {toTrack}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
 const part={cid:38410979580,page:1,title:'四、周旋权臣',durationSeconds:100}
 const detail={bvid:'BV1GFRFBREe6',title:'AI喻大华 守成天子嘉庆 未删减版 04周旋权臣',parts:[part],season:{id:1}}
 const track=toTrack(detail,part)
 assert.equal(track.displayTitle,'四、周旋权臣');assert.equal(track.title,'四、周旋权臣')
 assert.equal(track.id,'bilibili:BV1GFRFBREe6:38410979580');assert.equal(track.chapterContext,true)
 assert.equal(toTrack({...detail,season:undefined},part).title,detail.title)
})
