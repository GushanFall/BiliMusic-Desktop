import { lockDialogBackground } from './dialogInert'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { focusable } from './focus'
import { captureBookmark, restoreView, type FocusBookmark } from './navigation'

export function LargeDialog({ title, onClose, children, drawer = false, className = '' }: { title: string; onClose: () => void; children: ReactNode; drawer?: boolean; className?: string }) {
  const ref = useRef<HTMLElement>(null), close = useRef(onClose)
  const origin = useRef<{ element: HTMLElement | null; host: HTMLElement | null; bookmark?: FocusBookmark; top: number } | null>(null)
  close.current = onClose
  useLayoutEffect(() => {
    if (!origin.current) {
      const element = document.activeElement as HTMLElement | null, host = element?.closest<HTMLElement>('.large-dialog,.large-shell') || null
      origin.current = { element, host, bookmark: host ? captureBookmark(host) : undefined, top: host?.querySelector('.large-main')?.scrollTop || host?.scrollTop || 0 }
    }
    const root = document.getElementById('root'), releaseBackground = root ? lockDialogBackground(root) : undefined
    focusable(ref.current!)[0]?.focus()
    const back = (event: Event) => {
      const dialogs = document.querySelectorAll('.large-dialog')
      if (dialogs[dialogs.length - 1] !== ref.current) return
      event.preventDefault(); event.stopImmediatePropagation(); close.current()
    }
    window.addEventListener('bilimusic-back', back, true)
    return () => {
      window.removeEventListener('bilimusic-back', back, true)
      releaseBackground?.()
      const previous = origin.current!
      if (previous.element?.isConnected) previous.element.focus({ preventScroll: true })
      else if (previous.host?.isConnected) restoreView(previous.host, previous.host.querySelector<HTMLElement>('.large-main') || previous.host, previous.bookmark, previous.top, () => false)
      else document.querySelector<HTMLElement>('.large-shell [aria-current="page"]')?.focus()
    }
  }, [])
  return createPortal(<div className={`large-scrim${drawer ? ' large-drawer-scrim' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <section ref={ref} className={`large-dialog${drawer ? ' large-drawer' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button className="large-icon" aria-label={`关闭${title}`} onClick={onClose}><X/></button></header>{children}
    </section>
  </div>, document.body)
}
