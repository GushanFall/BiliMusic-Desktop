// Initial positioning must finish before play(). Reusing this for a paused
// player or an audio-quality handoff would incorrectly reapply resume policy.
export async function preparePlaybackStart(element: HTMLAudioElement, choose: (duration: number) => number, valid: () => boolean, needsDuration = false) {
  const wait = (event: string, ready: () => boolean) => new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer); clearInterval(check)
      element.removeEventListener(event, changed); element.removeEventListener('error', failed)
      error ? reject(error) : resolve()
    }
    const changed = () => { if (!valid()) finish(new Error('播放已取消')); else if (ready()) finish() }
    const failed = () => finish(new Error('音频起始位置准备失败，请重试'))
    const timer = setTimeout(failed, 12000), check = setInterval(changed, 50)
    element.addEventListener(event, changed); element.addEventListener('error', failed); changed()
  })
  await wait('loadedmetadata', () => element.readyState >= 1 && (!needsDuration || Number.isFinite(element.duration) && element.duration > 0))
  const position = Math.max(0, choose(element.duration))
  if (Math.abs(element.currentTime - position) > .1) {
    element.currentTime = position
    await wait('seeked', () => !element.seeking && Math.abs(element.currentTime - position) <= .5)
  }
  if (!valid()) throw new Error('播放已取消')
  return position
}
