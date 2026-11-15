import { createHash } from 'node:crypto'
import { inspectDownloadHeaders } from './release_content_types.mjs'

// Small independent ranges avoid stalled bulk transfers on some workstation
// routes. Every byte is still fetched from the public URL and hashed in order.
export async function verifyPublicAsset(platform, channel, request = fetch) {
  const chunkSize = 256 * 1024
  let headers
  const ensureResponse = response => {
    if (!response.ok || !response.url.startsWith('https://')) throw new Error('Download unavailable')
    headers = inspectDownloadHeaders(platform.file, response.headers)
  }
  const hash = createHash('sha256')
  let size = 0
  if (channel.id === 'github' && platform.size > chunkSize) {
    const bytes = Buffer.alloc(platform.size)
    let next = 0, etag, cancelled = false
    const worker = async () => {
      while (next < platform.size && !cancelled) {
        const start = next, end = Math.min(start + chunkSize, platform.size) - 1
        next = end + 1
        const response = await request(channel.url, { signal: AbortSignal.timeout(30_000), headers: { 'user-agent': 'BiliMusic-release-verification', Range: `bytes=${start}-${end}`, Connection: 'close' } })
        try {
          ensureResponse(response)
          if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${platform.size}`) throw new Error('Public download range mismatch')
          const current = response.headers.get('etag')
          if (!current || etag && etag !== current) throw new Error('Public download changed during verification')
          etag = current
          let offset = start
          for await (const chunk of response.body) {
            if (offset + chunk.length > end + 1) throw new Error('Download range exceeded manifest')
            bytes.set(chunk, offset); offset += chunk.length
          }
          if (offset !== end + 1) throw new Error('Incomplete public download range')
        } catch (error) { cancelled = true; throw error }
      }
    }
    const workers = await Promise.allSettled(Array.from({ length: 4 }, worker))
    const failed = workers.find(result => result.status === 'rejected')
    if (failed) throw failed.reason
    hash.update(bytes); size = bytes.length
  } else {
    const response = await request(channel.url, { signal: AbortSignal.timeout(180_000), headers: { 'user-agent': 'BiliMusic-release-verification' } })
    ensureResponse(response)
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > platform.size) throw new Error('Download size exceeded manifest')
      hash.update(chunk)
    }
  }
  const sha256 = hash.digest('hex')
  if (size !== platform.size || sha256 !== platform.sha256) throw new Error('Downloaded size or SHA-256 mismatch')
  return { url: channel.url, size, sha256, platform: platform.id, channel: channel.id, ...headers }
}
