export function fitMediaFrame(width: number, height: number, ratio: number) {
  const aspect = Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9
  const h = Math.max(0, Math.min(height, width / aspect))
  return { width: h * aspect, height: h }
}

// Native scroll padding allows the first and final lyric to reach the center.
export function centeredLyricScroll(lineOffset: number, lineHeight: number, viewportHeight: number, scrollHeight: number) {
  return Math.max(0, Math.min(Math.max(0, scrollHeight - viewportHeight), lineOffset + lineHeight / 2 - viewportHeight / 2))
}
