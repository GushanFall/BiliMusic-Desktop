import { createNativeAudio } from './nativeAudio'
import { invoke } from '@tauri-apps/api/core'
import type { Track } from '../../domain/track'
import type { QueueSource, RepeatMode } from './playerStore'
import type { ResumeThreshold } from './resumePolicy'
const audio = createNativeAudio('android-player')
export const syncAndroidQueue = (tracks: Track[], repeatMode: RepeatMode, shuffled: boolean, resumeThresholdSeconds: ResumeThreshold = 0, source?: QueueSource) => invoke('plugin:android-player|queue', { data: JSON.stringify({ tracks, repeatMode, shuffled, autoResume: resumeThresholdSeconds !== null, resumeThresholdSeconds, collectionPlayback: Boolean(source?.collectionRef) || source?.kind === 'season', collectionRef: source?.collectionRef }) })
export const { observe: observeAndroidAudio, play: playAndroidAudio, setCollection: setAndroidCollection, control: controlAndroidAudio, snapshot: snapshotAndroidAudio, playbackClock: androidPlaybackClock, prepare: prepareAndroidAudio } = audio
