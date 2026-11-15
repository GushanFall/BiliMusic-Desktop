import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, LoaderCircle, RotateCcw } from 'lucide-react'
import { androidDownloadDestination, androidDownloadDestinationKey } from '../../services/androidDownloads'
import { commandErrorMessage } from '../../services/desktopApi'

export function AndroidDownloadDestinationField({ disabled = false, onOpenDownloads }: { disabled?: boolean; onOpenDownloads?: () => void }) {
  const client = useQueryClient()
  const destination = useQuery({ queryKey: androidDownloadDestinationKey, queryFn: () => androidDownloadDestination(), retry: false })
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const change = async (action: 'choose' | 'reset') => {
    setBusy(true); setError('')
    try { client.setQueryData(androidDownloadDestinationKey, await androidDownloadDestination(action)) }
    catch (cause) { setError(commandErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <div className="android-download-destination">
    <div className="download-destination-row"><span className="download-destination-copy"><strong>保存文件夹</strong><small>{destination.isPending ? '正在读取…' : destination.data?.label || '暂时无法读取目录'}{destination.data?.custom && !destination.data.available ? ' · 需要重新授权' : ''}</small></span>
      <button type="button" className="collection-flat-button" disabled={disabled || busy || destination.isPending} onClick={() => void change('choose')}>{busy ? <LoaderCircle size={16} className="spin"/> : <FolderOpen size={16}/>}选择文件夹</button></div>
    <p className="download-destination-hint">可在系统文件管理器中查看。选择“下载”中的子文件夹时，可先新建 BiliMusic 文件夹。</p>
    <div className="download-destination-actions">
      {destination.data?.custom && destination.data.canReset && <button type="button" className="collection-flat-button" disabled={disabled || busy} onClick={() => void change('reset')}><RotateCcw size={16}/>使用默认</button>}
      {onOpenDownloads && <button type="button" className="collection-flat-button" onClick={onOpenDownloads}><FolderOpen size={16}/>查看下载</button>}
    </div>
    {(error || destination.isError) && <p role="alert" className="inline-error">{error || commandErrorMessage(destination.error)}</p>}
  </div>
}
