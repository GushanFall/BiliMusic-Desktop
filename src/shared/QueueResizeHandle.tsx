import { useLayoutEffect, useRef } from 'react'

const storageKey = 'bilimusic-queue-width'
const initialWidth = 300
const minimumWidth = 280
const maximumWidth = 640

export function QueueResizeHandle() {
  const handle = useRef<HTMLDivElement>(null)
  const width = useRef(initialWidth)
  const preferred = useRef(initialWidth)
  const drag = useRef<{ pointerId: number; x: number; width: number } | null>(null)
  const limit = () => Math.max(minimumWidth, Math.min(maximumWidth, window.innerWidth - 48))
  const apply = (value: number) => {
    width.current = Math.round(Math.max(minimumWidth, Math.min(limit(), value)))
    handle.current?.parentElement?.style.setProperty('--queue-width', `${width.current}px`)
    handle.current?.setAttribute('aria-valuenow', String(width.current))
    handle.current?.setAttribute('aria-valuemax', String(limit()))
  }
  const save = (value: number) => {
    apply(value); preferred.current = width.current
    try { localStorage.setItem(storageKey, String(preferred.current)) } catch { /* Resizing also works without persistent storage. */ }
  }
  const finish = (commit: boolean) => {
    const active = drag.current
    if (!active) return
    drag.current = null
    delete handle.current?.parentElement?.dataset.resizingQueue
    if (commit) save(width.current)
    else apply(active.width)
    if (handle.current?.hasPointerCapture(active.pointerId)) handle.current.releasePointerCapture(active.pointerId)
  }
  useLayoutEffect(() => {
    try {
      const value = Number(localStorage.getItem(storageKey))
      if (Number.isFinite(value) && value >= minimumWidth && value <= maximumWidth) preferred.current = value
    } catch { /* Use the default width. */ }
    apply(preferred.current)
    const resize = () => { if (!drag.current) apply(preferred.current) }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  return <div ref={handle} className="queue-resize-handle" role="separator" tabIndex={0}
    aria-label="调整播放列表宽度" aria-controls="playback-queue" aria-orientation="vertical"
    aria-valuemin={minimumWidth} aria-valuemax={maximumWidth} aria-valuenow={initialWidth}
    onPointerDown={event => {
      if (event.button !== 0) return
      event.preventDefault()
      drag.current = { pointerId: event.pointerId, x: event.clientX, width: width.current }
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.parentElement!.dataset.resizingQueue = 'true'
    }}
    onPointerMove={event => { const active = drag.current; if (active?.pointerId === event.pointerId) apply(active.width + active.x - event.clientX) }}
    onPointerUp={() => finish(true)} onPointerCancel={() => finish(false)} onLostPointerCapture={() => finish(true)}
    onDoubleClick={() => save(initialWidth)}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); save(width.current + (event.key === 'ArrowLeft' ? 10 : -10)) }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); save(event.key === 'Home' ? minimumWidth : limit()) }
    }}/>
}
