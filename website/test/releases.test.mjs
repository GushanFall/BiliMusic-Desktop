import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDownload } from '../releases.mjs';
const request = { platform:'mac',source:'github',consent:true,policyVersion:'current' };
test('only declared release files are returned after current consent', () => {
  const result = resolveDownload(request,'current');
  assert.ok(result.url.endsWith('.dmg')); assert.match(result.sha256,/^[a-f0-9]{64}$/);
  for (const patch of [{consent:false},{policyVersion:'old'},{source:'https://example.com'},{platform:'unknown'}]) assert.throws(() => resolveDownload({...request,...patch},'current'));
});
test('reject unavailable mirror and external redirect configuration', () => {
  const manifest = {platforms:[{id:'mac',status:'available',channels:[{id:'gitee',url:null},{id:'github',url:'https://github.com.evil.test/file'}]}]};
  assert.throws(() => resolveDownload({...request,source:'gitee'},'current',manifest));
  assert.throws(() => resolveDownload(request,'current',manifest));
});

test('all platforms provide both declared download channels', () => {
  for (const platform of ['mac','windows','android','ios','ohos']) for (const source of ['gitee','github']) {
    const result=resolveDownload({...request,platform,source},'current');
    assert.ok(result.url.endsWith(result.file));
    assert.match(result.sha256,/^[a-f0-9]{64}$/);
    if(platform==='android') assert.ok(result.file.endsWith('.apk'));
    if(platform==='ios') assert.ok(result.file.endsWith('.ipa'));
    if(platform==='ohos') assert.ok(result.file.endsWith('-unsigned.hap'));
  }
});

test('large-screen edition resolves independently from the phone APK', () => {
  const item = id => ({ id, status:'available', file:id+'.apk', sha256:'a'.repeat(64), channels:[{id:'github',url:'https://github.com/licpp/BiliMusic-Desktop/releases/download/v0.3.4/'+id+'.apk'}] });
  const manifest={platforms:[item('android'),item('android-large')]};
  assert.equal(resolveDownload({...request,platform:'android-large'},'current',manifest).file,'android-large.apk');
  assert.equal(resolveDownload({...request,platform:'android'},'current',manifest).file,'android.apk');
});
