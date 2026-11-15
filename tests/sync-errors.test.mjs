import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({ entryPoints: ['src/services/userErrors.ts'], bundle: true, write: false, format: 'cjs', platform: 'node' })
const module = { exports: {} }
new Function('module', 'exports', compiled.outputFiles[0].text)(module, module.exports)
const { syncErrorMessage, commandErrorMessage } = module.exports

test('sync status codes retain the reason, recovery advice and failed operation', () => {
  for (const [status, hint] of [[401,'应用密码'],[403,'权限'],[404,'服务器地址'],[405,'WebDAV'],[409,'冲突'],[412,'重新同步'],[413,'大小'],[423,'锁定'],[429,'频繁'],[500,'服务器'],[502,'网关'],[503,'暂不可用'],[504,'超时'],[507,'剩余空间'],[301,'重定向'],[418,'异常响应']]) {
    const result = syncErrorMessage(`创建同步目录失败：坚果云返回 HTTP ${status}`)
    assert.ok(result.startsWith('创建同步目录失败：'), result)
    assert.ok(result.includes(`HTTP ${status}`), result)
    assert.ok(result.includes(hint), result)
  }
})
test('real 0.3.2 WebDAV errors no longer collapse into the generic request failure', () => {
  for (const message of ['同步授权失效（HTTP 401），请使用坚果云应用密码重新连接（已停止自动重试）', '坚果云拒绝访问（HTTP 403），请检查账号权限、服务器目录及服务限制', '坚果云目录冲突（HTTP 409），请检查服务器地址是否指向已存在的文件夹']) {
    assert.equal(commandErrorMessage(message), '请求失败，请稍后重试')
    assert.notEqual(syncErrorMessage(message), '请求失败，请稍后重试')
  }
})
test('status diagnostics never echo URLs, credentials, response bodies or arbitrary operation text', () => {
  for (const value of [
    'HTTP 403 https://user:secret@dav.example/uid/private-file <html>private body</html>',
    '创建同步目录失败：HTTP 409 https://dav.example/uid/private-file token=secret',
    'secret operation: HTTP 401 secret',
  ]) {
    const result = syncErrorMessage({ message: value })
    for (const secret of ['secret','private','https://','token=','<html>']) assert.ok(!result.includes(secret), result)
  }
  assert.equal(syncErrorMessage('error sending request for url (https://dav.example/private)'), '暂时无法连接服务器，请检查网络后重试')
  assert.equal(syncErrorMessage('request timed out'), '连接超时，请重试')
  assert.equal(syncErrorMessage('读取同步目录失败：连接超时，请检查网络后重试'), '读取同步目录失败：连接超时，请重试')
  assert.equal(syncErrorMessage('bad opaque error'), '同步失败，请稍后重试')
})
