import { invoke } from '@tauri-apps/api/core'

export type AndroidDownloadDestination = { label: string; available: boolean; custom: boolean; canReset: boolean; cancelled?: boolean }
export const androidDownloadDestinationKey = ['android-download-destination']
export const androidDownloadDestination = (action: 'status' | 'choose' | 'reset' = 'status') =>
  invoke<AndroidDownloadDestination>('android_download_destination', { action })
