import { focusable } from './focus'
import { restoreScroll } from '../shared/restoreScroll'

export type FocusBookmark = { key?: string; label: string; tag: string; region: string; index: number; occurrence: number; openGroups?: string[] }
export type FocusCandidate = { key?: string; label: string; tag: string }
export function matchBookmark(bookmark: FocusBookmark, candidates: FocusCandidate[], fallback = false) {
  if (bookmark.key) { const at = candidates.findIndex(c => c.key === bookmark.key); if (at >= 0) return at }
  const matches = candidates.flatMap((c, i) => c.tag === bookmark.tag && c.label === bookmark.label && c.label ? [i] : [])
  if (matches.length) return matches[Math.min(bookmark.occurrence, matches.length - 1)]
  return fallback && candidates.length ? Math.min(bookmark.index, candidates.length - 1) : -1
}
const describe = (el: HTMLElement): FocusCandidate => ({ key: el.dataset.focus, label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim(), tag: el.tagName })
const region = (el: HTMLElement) => el.closest('.large-main') ? '.large-main' : el.closest('.large-dock') ? '.large-dock' : el.closest('.large-nav') ? '.large-nav' : ''
const groupKey = (el: HTMLDetailsElement) => el.dataset.focus || el.querySelector('summary strong')?.textContent?.trim() || el.querySelector('summary')?.textContent?.trim() || ''
export function captureBookmark(root: HTMLElement): FocusBookmark | undefined {
  const active = document.activeElement as HTMLElement
  if (!active || !root.contains(active)) return
  const area = region(active), host = area ? root.querySelector(area) || root : root, items = focusable(host), index = items.indexOf(active), description = describe(active)
  if (index < 0) return
  return { ...description, region: area, index, openGroups: [...root.querySelectorAll<HTMLDetailsElement>('details[open]')].map(groupKey).filter(Boolean), occurrence: items.slice(0, index).filter(el => { const d = describe(el); return d.label === description.label && d.tag === description.tag }).length }
}

// A cached view can mount before its async rows. Wait for the original control
// instead of focusing the back button, and cancel if the user starts navigating.
export function restoreView(root: HTMLElement, main: HTMLElement, bookmark: FocusBookmark | undefined, top: number, busy: () => boolean) {
  const stopScroll = restoreScroll(main, top)
  let stopped = false, quiet = 0
  const finish = () => { if (stopped) return; stopped = true; clearInterval(timer); clearTimeout(deadline); observer.disconnect(); for (const name of ['pointerdown', 'keydown', 'wheel', 'touchstart']) root.removeEventListener(name, cancel, true) }
  const cancel = () => { finish(); stopScroll() }
  const attempt = (fallback = false) => {
    if (stopped) return
    if (bookmark?.openGroups?.length) for (const group of root.querySelectorAll<HTMLDetailsElement>('details')) if (bookmark.openGroups.includes(groupKey(group))) group.open = true
    const host = bookmark?.region ? root.querySelector(bookmark.region) || main : main, items = focusable(host)
    const index = bookmark ? matchBookmark(bookmark, items.map(describe), fallback) : fallback ? 0 : -1
    if (index >= 0) { main.scrollTop = top; items[index].focus({ preventScroll: true }); finish() }
  }
  const observer = new MutationObserver(() => { quiet = 0; attempt() })
  observer.observe(main, { childList: true, subtree: true })
  const timer = setInterval(() => { attempt(); if (!busy() && ++quiet >= 2) attempt(true) }, 120)
  const deadline = setTimeout(() => { attempt(true); finish() }, 10000)
  for (const name of ['pointerdown', 'keydown', 'wheel', 'touchstart']) root.addEventListener(name, cancel, { capture: true, once: true })
  queueMicrotask(() => attempt())
  return cancel
}
