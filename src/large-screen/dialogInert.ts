const locks = new WeakMap<HTMLElement, { count: number; original: boolean }>()

// Opening the download chooser can overlap the outgoing track menu for a render.
// Restore the root only after every dialog has released its lock, in any order.
export function lockDialogBackground(root: HTMLElement) {
  const state = locks.get(root) || { count: 0, original: root.inert }
  state.count++; locks.set(root, state); root.inert = true
  let released = false
  return () => {
    if (released) return
    released = true
    if (--state.count === 0) { root.inert = state.original; locks.delete(root) }
  }
}
