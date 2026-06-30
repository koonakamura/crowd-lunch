import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiClient, mediaUrl, type CatV2MenuItem } from '../lib/api'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { toServeDateKey } from '../lib/dateUtils'
import { makeTodayWindow, todayJST } from '../lib/dateWindow'
import { getAvailableTimeSlots, isCutoffTimeExpired } from '../utils/timeUtils'
import CafeIcon from '../components/icons/CafeIcon'

import mon from '@/assets/defaults/monday.jpeg'
import tue from '@/assets/defaults/tuesday.jpeg'
import wed from '@/assets/defaults/wednesday.jpeg'
import thu from '@/assets/defaults/thursday.jpeg'
import fri from '@/assets/defaults/friday.jpeg'
import sat from '@/assets/defaults/AdobeStock_792531420_Preview_churrasco.jpeg'
import sun from '@/assets/defaults/AdobeStock_387834369_Preview_pizza.jpeg'

type CartLine = {
  key: string
  dailyMenuId: number
  name: string
  unitBase: number
  optionIds: number[]
  optionLabels: string[]
  optionDelta: number
  qty: number
}

const DOW_IMG: Record<number, string> = { 0: sun, 1: mon, 2: tue, 3: wed, 4: thu, 5: fri, 6: sat }

export default function OrderV2Page() {
  const [showLanding, setShowLanding] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [lines, setLines] = useState<CartLine[]>([])
  const [optItem, setOptItem] = useState<CatV2MenuItem | null>(null)
  const [optSel, setOptSel] = useState<Record<number, Set<number>>>({})
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [department, setDepartment] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const windowDates = useMemo(() => makeTodayWindow(undefined, 7), [])
  const startKey = toServeDateKey(windowDates[0])
  const endKey = toServeDateKey(windowDates[6])

  const { data, isLoading } = useQuery({
    queryKey: ['v2Range', startKey, endKey] as const,
    queryFn: () => apiClient.getV2MenusRange(startKey, endKey),
    refetchInterval: 15000,
  })

  const bgFor = (dateKey: string, items: CatV2MenuItem[]) => {
    const img = items.find((m) => m.image_url)?.image_url
    if (img) return mediaUrl(img)!
    const [y, m, d] = dateKey.split('-').map(Number)
    return DOW_IMG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? mon
  }

  const total = lines.reduce((s, l) => s + (l.unitBase + l.optionDelta) * l.qty, 0)

  const onTapMenu = (m: CatV2MenuItem) => {
    if (m.option_groups.length > 0) {
      // 必須/初期選択をセット
      const init: Record<number, Set<number>> = {}
      for (const g of m.option_groups) {
        if (g.is_required && g.max_select <= 1 && g.options[0]) init[g.id] = new Set([g.options[0].id])
        else init[g.id] = new Set()
      }
      setOptSel(init)
      setOptItem(m)
      return
    }
    // オプション無し: トグル
    setLines((prev) => {
      const key = `${m.daily_menu_id}`
      const exists = prev.find((l) => l.key === key)
      if (exists) return prev.filter((l) => l.key !== key)
      return [...prev, { key, dailyMenuId: m.daily_menu_id, name: m.name, unitBase: m.price, optionIds: [], optionLabels: [], optionDelta: 0, qty: 1 }]
    })
  }

  const confirmOptions = () => {
    if (!optItem) return
    const ids: number[] = []
    const labels: string[] = []
    let delta = 0
    for (const g of optItem.option_groups) {
      const chosen = optSel[g.id]
      if (chosen) for (const o of g.options) if (chosen.has(o.id)) { ids.push(o.id); labels.push(o.name); delta += o.price_delta }
    }
    const key = `${optItem.daily_menu_id}:${ids.slice().sort((a, b) => a - b).join(',')}`
    setLines((prev) => {
      const ex = prev.find((l) => l.key === key)
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, { key, dailyMenuId: optItem.daily_menu_id, name: optItem.name, unitBase: optItem.price, optionIds: ids, optionLabels: labels, optionDelta: delta, qty: 1 }]
    })
    setOptItem(null)
  }

  const toggleOpt = (groupId: number, optionId: number, single: boolean) => {
    setOptSel((s) => {
      const grp = new Set(s[groupId] || [])
      if (single) { grp.clear(); grp.add(optionId) }
      else grp.has(optionId) ? grp.delete(optionId) : grp.add(optionId)
      return { ...s, [groupId]: grp }
    })
  }

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key))

  const submit = async () => {
    if (!department.trim() || !customerName.trim() || !deliveryTime || !deliveryLocation) return
    if (isCutoffTimeExpired()) { toast.error('18:14以降の注文受付は終了しております。'); return }
    setIsSubmitting(true)
    try {
      await apiClient.createV2GuestOrder({
        serve_date: selectedDateKey, delivery_type: 'desk', request_time: deliveryTime,
        department, name: customerName, delivery_location: deliveryLocation, note: note.trim() || undefined,
        items: lines.map((l) => ({ daily_menu_id: l.dailyMenuId, qty: l.qty, option_ids: l.optionIds })),
      })
      setShowOrderModal(false); setShowThankYou(true)
      setLines([]); setDepartment(''); setCustomerName(''); setNote(''); setDeliveryTime(''); setDeliveryLocation('')
    } catch (e) {
      const err = e as Error & { code?: string }
      const map: Record<string, string> = {
        cafe_time_closed: '本日のカフェタイム受付は終了しました', menu_not_available: 'このメニューはカフェタイムでは注文できません',
        invalid_timeslot: '選択した時間が有効範囲外です',
      }
      toast.error(map[err.code || ''] || '注文の送信に失敗しました。')
    } finally { setIsSubmitting(false) }
  }

  // 選択中の行が属する日付（最初の行の所属日）。無ければ最初の表示日。
  const days = data?.days || {}
  const dayKeys = Object.keys(days).sort()
  const selectedDateKey = useMemo(() => {
    if (lines.length === 0) return dayKeys[0] || toServeDateKey(todayJST(undefined))
    for (const k of dayKeys) if (days[k].some((m) => lines.some((l) => l.dailyMenuId === m.daily_menu_id))) return k
    return dayKeys[0] || toServeDateKey(todayJST(undefined))
  }, [lines, dayKeys, days])
  const selDate = windowDates.find((d) => toServeDateKey(d) === selectedDateKey)

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Loading...</div></div>

  if (showLanding) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center cursor-pointer transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => { setFadeOut(true); setTimeout(() => setShowLanding(false), 500) }}>
        <h1 className="text-6xl font-bold text-black tracking-wide font-lato">CROWD LUNCH</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-black font-lato tracking-wide">CROWD LUNCH</h1>
      </header>

      <div className="pt-16 grid grid-cols-1 gap-6">
        {dayKeys.map((dateKey, index) => {
          const items = days[dateKey] || []
          const date = new Date(dateKey + 'T00:00:00')
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
          const dayCount = items.reduce((s, m) => s + lines.filter((l) => l.dailyMenuId === m.daily_menu_id).reduce((a, l) => a + l.qty, 0), 0)
          return (
            <section key={dateKey} className="relative isolate">
              <div className="relative bg-black min-h-[calc(100dvh-64px)] pb-6">
                <img src={bgFor(dateKey, items)} onError={(e) => { (e.currentTarget as HTMLImageElement).src = mon }} alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center select-none z-0" draggable={false} />
                <header className="px-4 pt-6 pb-2 text-center text-white relative z-10">
                  <div className="text-5xl md:text-6xl font-libre tabular-nums leading-none">{format(date, 'M/d')}</div>
                  <div className="text-xl md:text-2xl font-libre mt-1">{dayName}</div>
                </header>
                <div className="px-3 md:px-4 mt-4 relative z-10">
                  <div className="mx-auto w-[92%] sm:w-[86%] md:w-[80%] max-w-[960px] flex flex-col gap-3 pb-16">
                    {items.length === 0 && <div className="text-center text-white/80 py-10">この日のメニューはまだありません</div>}
                    {items.map((m) => {
                      const selected = lines.some((l) => l.dailyMenuId === m.daily_menu_id)
                      return (
                        <button key={m.daily_menu_id} onClick={() => onTapMenu(m)} disabled={(m.max_qty || 0) <= 0}
                          className={`px-3 py-[6px] md:px-4 md:py-[10px] rounded-full text-white font-semibold transition-colors inline-flex mx-3 backdrop-blur-sm ring-[0.66px] ring-gray-300/70 relative z-10 leading-tight w-full ${selected ? 'bg-primary' : (m.max_qty || 0) <= 0 ? 'bg-gray-500 cursor-not-allowed' : 'bg-black/50 hover:bg-black/70'}`}>
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-lg whitespace-nowrap truncate max-w-[65vw] md:max-w-[480px]">{m.name}</span>
                              <span className="text-sm whitespace-nowrap">({m.max_qty})</span>
                              {m.option_groups.length > 0 && <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">＋オプション</span>}
                            </div>
                            <div className="flex items-center gap-2 leading-none">
                              {m.cafe_time_available && <CafeIcon className="inline-block align-middle h-[1.5em] w-[1.5em] text-white/90" aria-hidden="true" />}
                              <span className="text-lg font-bold tabular-nums whitespace-nowrap">{m.price}円</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent z-10" />
                {dayCount > 0 && (
                  <div className="sticky top-[calc(100vh-(64px+env(safe-area-inset-bottom)))] z-20 pointer-events-none mt-6">
                    <div className="mx-auto w-[92%] md:w-[80%] max-w-[960px] flex justify-center">
                      <button type="button" onClick={() => setShowOrderModal(true)}
                        className="pointer-events-auto rounded-full px-6 py-3 bg-amber-500/95 text-white font-semibold shadow-lg ring-1 ring-white/20">
                        注文（{dayCount}個）
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {index < dayKeys.length - 1 && null}
            </section>
          )
        })}
      </div>

      {/* Option picker */}
      <Dialog open={!!optItem} onOpenChange={(o) => !o && setOptItem(null)}>
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md rounded-3xl">
          <DialogHeader><DialogTitle className="text-white text-xl">{optItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {optItem?.option_groups.map((g) => {
              const single = g.max_select <= 1
              return (
                <div key={g.id}>
                  <div className="text-sm font-medium mb-1">{g.name}{g.is_required ? '（必須）' : ''}{single ? '' : '（複数可）'}</div>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const checked = !!optSel[g.id]?.has(o.id)
                      return (
                        <button key={o.id} onClick={() => toggleOpt(g.id, o.id, single)}
                          className={`text-sm border rounded-full px-3 py-1 ${checked ? 'bg-primary border-primary text-white' : 'bg-white/10 border-white/30 text-white'}`}>
                          {o.name}{o.price_delta ? ` +¥${o.price_delta}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={confirmOptions} className="w-full bg-primary hover:bg-primary/90 text-white">追加する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white text-xl">注文確認</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.key} className="flex items-start justify-between gap-2">
                  <div>
                    <div>{l.name}{l.qty > 1 ? <span className="ml-1 text-sm">× {l.qty}</span> : null}</div>
                    {l.optionLabels.length > 0 && <div className="text-xs text-white/70">＋{l.optionLabels.join('、')}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{(l.unitBase + l.optionDelta) * l.qty}円</span>
                    <button className="text-white/60 hover:text-red-400" onClick={() => removeLine(l.key)}>×</button>
                  </div>
                </div>
              ))}
              {lines.length === 0 && <div className="text-sm text-white/70">（選択中のメニューはありません）</div>}
              <div className="mt-3 border-t border-white/20 pt-3 flex justify-between"><span>合計</span><span className="tabular-nums font-semibold">{total}円</span></div>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">部署</label><Input value={department} onChange={(e) => setDepartment(e.target.value)} className="bg-white border-gray-300 text-black" placeholder="部署名を入力" /></div>
              <div><label className="block text-sm font-medium mb-1">お名前</label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-white border-gray-300 text-black" placeholder="お名前を入力" /></div>
              <div><label className="block text-sm font-medium mb-1">備考</label><Input value={note} onChange={(e) => setNote(e.target.value)} className="bg-white border-gray-300 text-black" placeholder="ご要望など（任意）" maxLength={500} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">お届け場所</label>
                <div className="flex gap-4">
                  {['5F', '10F'].map((f) => (
                    <label key={f} className="flex items-center text-white"><input type="radio" value={f} checked={deliveryLocation === f} onChange={(e) => setDeliveryLocation(e.target.value)} className="mr-2" />{f}</label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">希望お届け時間</label>
                <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                  <SelectTrigger className="bg-white border-gray-300 text-black"><SelectValue placeholder="時間を選択" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    {getAvailableTimeSlots(selDate || undefined).map((slot) => (
                      <SelectItem key={slot.value} value={slot.value} disabled={slot.disabled} className={slot.disabled ? 'bg-gray-200 text-gray-400' : ''}>{slot.value}{slot.disabled ? ' (終了)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={lines.length === 0 || isSubmitting || !department.trim() || !customerName.trim() || !deliveryTime || !deliveryLocation}
              className="w-full bg-primary hover:bg-primary/90 text-white">{isSubmitting ? '注文中...' : '注文確定'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thank you */}
      <Dialog open={showThankYou} onOpenChange={setShowThankYou}>
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md rounded-3xl">
          <DialogHeader><DialogTitle className="text-white text-xl text-center">注文を承りました。</DialogTitle></DialogHeader>
          <div className="space-y-4 text-center">
            <p>ご指定の時間にお座席にお届けします。</p>
            <p>支払いはタッチ決済のご用意をお願いします。</p>
            <p>それでは時間まで楽しみにお待ちください。</p>
          </div>
          <DialogFooter><Button onClick={() => setShowThankYou(false)} className="w-full bg-primary hover:bg-primary/90 text-white">戻る</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
