import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const output=await build({entryPoints:['src/features/lyrics/danmakuLayout.ts'],bundle:true,write:false,format:'esm'})
const {layoutDanmaku,danmakuX}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`)
const item=(time,mode=1)=>({timeSeconds:time,mode,fontSize:25,color:0xffffff,text:'test'})
const measure=()=>({width:200,height:35})
test('sparse comments restart at the top instead of their global index modulo the screen height',()=>{
 const list=Array.from({length:200},(_,i)=>item(i*10))
 for(const [w,h] of [[360,200],[1920,1080]]){
  const layout=layoutDanmaku(list,w,h,1,measure)
  assert.equal(layout.length,200);assert.ok(layout.every(p=>p.y===8))
  assert.equal(danmakuX(layout[100],1000,w),w)
 }
})
test('simultaneous comments fill top lanes in order and drop overflow without overlap',()=>{
 const layout=layoutDanmaku(Array.from({length:100},()=>item(0)),1920,1080,1,measure)
 assert.ok(layout.length>1&&layout.length<100)
 assert.deepEqual(layout.map(p=>p.y),layout.map((_,i)=>8+i*35))
 const sparse=layoutDanmaku(Array.from({length:100},()=>item(0)),1920,1080,.125,measure)
 assert.ok(sparse.length<layout.length)
})
test('followers reuse the first lane only when entry and future catch-up are safe',()=>{
 const layout=layoutDanmaku([item(0),item(.1),item(2),item(10)],1000,500,1,measure)
 assert.deepEqual(layout.map(p=>p.y),[8,43,8,8])
 const varied=layoutDanmaku([item(0),{...item(2),text:'very wide'}],1000,500,1,i=>({width:i.text==='test'?50:1000,height:35}))
 assert.equal(varied[1].y,43) // A long fast follower would catch the first comment.
})
test('fixed top, bottom and reverse directions retain their designated behavior after resizing',()=>{
 const layout=layoutDanmaku([item(0,5),item(0,4),item(0,6)],960,540,1,measure)
 assert.equal(layout[0].y,8);assert.ok(layout[1].y>400);assert.equal(layout[2].y,43)
 assert.equal(danmakuX(layout[0],2,960),380)
 assert.equal(danmakuX(layout[2],0,960),-200)
 assert.equal(danmakuX(layout[2],8,960),960)
 assert.deepEqual(layoutDanmaku([],0,0,1,measure),[])
})
