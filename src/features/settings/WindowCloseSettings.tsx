import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { PanelBottomClose } from 'lucide-react'
import { inDesktopShell, commandErrorMessage } from '../../services/desktopApi'
import { isMobile } from '../../services/platform'

export function WindowCloseSettings() {
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState('')
  const available=inDesktopShell&&!isMobile&&/Windows/i.test(navigator.userAgent)
  useEffect(()=>{if(available)void invoke<boolean>('window_close_to_tray').then(setEnabled).catch(e=>setError(commandErrorMessage(e))).finally(()=>setBusy(false))},[available])
  if(!available)return null
  return <><div className="settings-card"><div className="settings-icon"><PanelBottomClose/></div><div><strong id="close-to-tray-label">关闭时最小化到托盘</strong><small>关闭窗口后继续播放，可从托盘重新打开</small></div><button type="button" className="auto-resume-switch" role="switch" aria-labelledby="close-to-tray-label" aria-checked={enabled} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{setEnabled(await invoke<boolean>('window_close_to_tray',{enabled:!enabled}))}catch(e){setError(commandErrorMessage(e))}finally{setBusy(false)}}}><span aria-hidden="true"/></button></div>{error&&<p role="alert" className="settings-error">{error}</p>}</>
}
