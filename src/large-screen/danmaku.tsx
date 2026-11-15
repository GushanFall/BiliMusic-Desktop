import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDanmaku } from '../services/desktopApi'
import { RangeControl } from '../shared/RangeControl'

const densityLabels = ['1/8', '1/4', '1/2', '全屏']
function usePreference(key: string, initial: number, min: number, max: number) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key), n = stored === null ? initial : Number(stored)
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : initial
  })
  return [value, (next: number) => { setValue(next); localStorage.setItem(key, String(next)) }] as const
}
export function useLargeDanmaku(cid: number, ready: boolean) {
  const [visible, setVisible] = useState(() => localStorage.getItem('danmakuVisible') !== 'false')
  const [size, setSize] = usePreference('danmakuSize', 1, .6, 1.6)
  const [opacity, setOpacity] = usePreference('danmakuOpacity', .8, .2, 1)
  const [density, setDensity] = usePreference('danmakuDensity', 3, 0, 3)
  const query = useQuery({ queryKey: ['video-danmaku', cid], queryFn: () => getDanmaku(cid), enabled: cid > 0 && ready && visible, staleTime: 300000, retry: false })
  return { visible, toggle: () => setVisible(value => { localStorage.setItem('danmakuVisible', String(!value)); return !value }), size, setSize, opacity, setOpacity, density, setDensity, query }
}
export function LargeDanmakuSettings({ state }: { state: ReturnType<typeof useLargeDanmaku> }) {
  return <section className="large-setting-section large-danmaku-settings"><h3>弹幕</h3><button className="large-setting-toggle" aria-pressed={state.visible} onClick={state.toggle}>显示弹幕<small>{state.visible ? '已开启' : '未开启'}</small></button>
    <label>密度<output>{densityLabels[state.density]}</output><RangeControl aria-label="弹幕密度" min={0} max={3} step={1} value={state.density} onChange={e => state.setDensity(Number(e.target.value))}/></label>
    <label>字号<output>{state.size.toFixed(1)}×</output><RangeControl aria-label="弹幕字号" min={.6} max={1.6} step={.1} value={state.size} onChange={e => state.setSize(Number(e.target.value))}/></label>
    <label>透明度<output>{Math.round(state.opacity * 100)}%</output><RangeControl aria-label="弹幕透明度" min={.2} max={1} step={.1} value={state.opacity} onChange={e => state.setOpacity(Number(e.target.value))}/></label>
    {state.visible && state.query.error && <p className="large-error">弹幕加载失败<button onClick={() => void state.query.refetch()}>重试</button></p>}
  </section>
}
