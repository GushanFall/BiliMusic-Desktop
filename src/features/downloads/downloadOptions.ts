import type { DownloadOptions } from './downloadRequest'

export const downloadOptionsStorageKey = 'bilimusic-download-options-v1'
export const batchDownloadChoices = [{ id: 30251, label: 'Hi-Res 无损 · FLAC' }, { id: 30280, label: '高品质 · AAC（192K 档）' }, { id: 30232, label: '标准 · AAC（132K 档）' }, { id: 30216, label: '流畅 · AAC（64K 档）' }]
export function rememberedDownloadOptions(): Pick<DownloadOptions, 'audioId' | 'exportFormat'> {
  try {
    const value = JSON.parse(localStorage.getItem(downloadOptionsStorageKey) || '{}')
    return { audioId: value.exportFormat === 'flac' ? 30251 : Number.isSafeInteger(value.audioId) && value.audioId >= 0 && value.audioId <= 40000 ? value.audioId : 0, exportFormat: ['auto', 'original', 'flac'].includes(value.exportFormat) ? value.exportFormat : 'auto' }
  } catch { return { audioId: 0, exportFormat: 'auto' } }
}
