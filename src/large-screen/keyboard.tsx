import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { isAndroid } from '../services/platform'
import { controlMobileAudio } from '../features/player/mobileAudio'

export function dismissLargeKeyboard() {
  const active = document.activeElement
  if (active instanceof HTMLElement && active.matches('input,textarea,[contenteditable=true]')) {
    // Keep a useful D-pad destination after the IME disappears. Refocusing the
    // input here can reopen the native keyboard on some WebView versions.
    const host = active.closest('form,.large-dialog,.large-main')
    const controls = [...host?.querySelectorAll<HTMLElement>('input,textarea,button:not(:disabled),summary') || []]
    const next = controls.slice(controls.indexOf(active) + 1).find(el => el.matches('button,summary'))
    active.blur(); next?.focus({ preventScroll: true })
  }
  if (isAndroid) void controlMobileAudio('keyboard', 0).catch(() => undefined)
}

export function LargeKeyboardBar() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const observer = new MutationObserver(() => setOpen(Boolean(document.documentElement.dataset.keyboardOpen)))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-keyboard-open'] })
    const focus = (event: FocusEvent) => { const target = event.target as HTMLElement; if (isAndroid && document.documentElement.dataset.keyboardOpen && target.matches('button,summary') && !target.closest('.large-keyboard-bar')) void controlMobileAudio('keyboard', 0).catch(() => undefined) }
    document.addEventListener('focusin', focus)
    return () => { observer.disconnect(); document.removeEventListener('focusin', focus) }
  }, [])
  return open ? createPortal(<div className="large-keyboard-bar"><span>正在输入</span><button onPointerDown={e => e.preventDefault()} onClick={dismissLargeKeyboard}><Check size={20}/>完成输入</button></div>, document.body) : null
}
