/** A season can contain independent single-P videos with useful chapter names. */
export function sourceTitle(videoTitle: string, partTitle: string, partCount: number, chapter: boolean) {
  const part = partTitle.trim()
  const generic = /^(?:p\s*\d+|part\s*\d+|正片|视频|默认|默认标题)$/i.test(part)
  return part && (partCount > 1 || (chapter && !generic)) ? part : videoTitle
}
