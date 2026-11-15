import type { QueueSource } from '../features/player/playerStore'

// A playlist of unrelated songs must not bypass the single-video resume rule.
export function playlistContext(title: string, linked: boolean): QueueSource {
  return { kind: linked ? 'season' : 'video', title }
}
export function collectionContext(title: string, reference: string, season: boolean, partCount: number): QueueSource {
  return { kind: season ? 'season' : 'video', title, ...(season || partCount > 1 ? { collectionRef: reference } : {}) }
}
