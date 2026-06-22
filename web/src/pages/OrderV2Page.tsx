import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient, mediaUrl, type CatV2MenuItem } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { makeTodayWindow, todayJST } from '../lib/dateWindow'
import { toServeDateKey } from '../lib/dateUtils'
import { getAvailableTimeSlots } from '../utils/timeUtils'
import { toast } from '../hooks/use-toast'

const WD = ['日', '月', '火', '水', '木', '金', '土']

type Sel = { qty: number; options: Record<number, Set<number>> } // options: groupId -> set of optionId

export default function OrderV2Page() {
  const windowDates = useMemo(() => makeTodayWindow(undefined, 7), [])
  const [dateKey, setDateKey] = useState<string>(() => toServeDateKey(todayJST(undefined)))
  const [sel, setSel] = useState<Record<number, Sel>>({})
  const [dept, setDept] = useState('')
  const [name, setName] = useState('')
  const [loc, setLoc] = useState('')
  const [slot, setSlot] = useState('')
  const [done, setDone] = useState<{ order_id: string; total: number } | null>(null)

  const menus = useQuery({ queryKey: ['v2menus', dateKey], queryFn: () => apiClient.getV2Menus(dateKey) })
  const hero = useQuery({ queryKey: ['v2day', dateKey], queryFn: () => apiClient.getV2DaySetting(dateKey) })

  const selectedDate = windowDates.find((d) => toServeDateKey(d) === dateKey)
  const slots = useMemo(() => getAvailableTimeSlots(selectedDate), [selectedDate])

  const getSel = (id: number): Sel => sel[id] || { qty: 0, options: {} }
  const setQty = (id: number, q: number) => setSel((s) => ({ ...s, [id]: { ...getSel(id), qty: Math.max(0, q) } }))
  const toggleOption = (id: number, groupId: number, optionId: number, single: boolean) => {
    setSel((s) => {
      const cur = s[id] || { qty: 0, options: {} }
      const grp = new Set(cur.options[groupId] || [])
      if (single) { grp.clear(); grp.add(optionId) }
      else { grp.has(optionId) ? grp.delete(optionId) : grp.add(optionId) }
      return { ...s, [id]: { ...cur, qty: cur.qty || 1, options: { ...cur.options, [groupId]: grp } } }
    })
  }

  const items = menus.data || []
  const lineTotal = (m: CatV2MenuItem): number => {
    const s = getSel(m.daily_menu_id)
    if (s.qty <= 0) return 0
    let unit = m.price
    for (const g of m.option_groups) {
      const chosen = s.options[g.id]
      if (chosen) for (const o of g.options) if (chosen.has(o.id)) unit += o.price_delta
    }
    return unit * s.qty
  }
  const total = items.reduce((sum, m) => sum + lineTotal(m), 0)
  const hasItems = items.some((m) => getSel(m.daily_menu_id).qty > 0)

  const order = useMutation({
    mutationFn: () => {
      const orderItems = items
        .filter((m) => getSel(m.daily_menu_id).qty > 0)
        .map((m) => {
          const s = getSel(m.daily_menu_id)
          const option_ids: number[] = []
          for (const g of m.option_groups) {
            const chosen = s.options[g.id]
            if (chosen) chosen.forEach((oid) => option_ids.push(oid))
          }
          return { daily_menu_id: m.daily_menu_id, qty: s.qty, option_ids }
        })
      return apiClient.createV2GuestOrder({
        serve_date: dateKey, delivery_type: 'desk', request_time: slot,
        department: dept.trim(), name: name.trim(), delivery_location: loc.trim(), items: orderItems,
      })
    },
    onSuccess: (r) => setDone({ order_id: r.order_id, total: r.total_price }),
    onError: (e: Error & { code?: string }) => toast({ title: '注文できませんでした', description: e.message, variant: 'destructive' }),
  })

  const canSubmit = hasItems && dept.trim() && name.trim() && slot && !order.isPending

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-2xl">✅ 注文完了</p>
            <p>注文番号: <span className="font-bold">{done.order_id}</span></p>
            <p>合計: <span className="font-bold">¥{done.total.toLocaleString()}</span></p>
            <Button onClick={() => { setDone(null); setSel({}); setSlot('') }} className="w-full">続けて注文する</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {hero.data?.hero_image_url && (
        <div className="w-full h-40 bg-gray-200 overflow-hidden">
          <img src={mediaUrl(hero.data.hero_image_url)} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">CROWD LUNCH <span className="text-sm font-normal text-gray-400">(new)</span></h1>

        <div className="flex flex-wrap gap-2">
          {windowDates.map((d, i) => {
            const k = toServeDateKey(d)
            return (
              <Button key={i} variant={dateKey === k ? 'default' : 'outline'} size="sm"
                className={`rounded-3xl ${dateKey === k ? 'bg-black text-white' : 'bg-white text-black border-gray-300'}`}
                onClick={() => { setDateKey(k); setSel({}) }}>
                {format(d, 'M/d')}({WD[d.getDay()]})
              </Button>
            )
          })}
        </div>

        {menus.isLoading && <p className="text-gray-500">読み込み中…</p>}
        {!menus.isLoading && items.length === 0 && <p className="text-gray-500 py-8 text-center">この日のメニューはまだありません</p>}

        <div className="space-y-3">
          {items.map((m) => {
            const s = getSel(m.daily_menu_id)
            return (
              <Card key={m.daily_menu_id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    {m.image_url && <img src={mediaUrl(m.image_url)} alt="" className="w-14 h-14 rounded object-cover" />}
                    <div className="flex-1">
                      {m.category && <span className="text-xs text-gray-400">{m.category}</span>}
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-gray-600">¥{m.price.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setQty(m.daily_menu_id, s.qty - 1)}>−</Button>
                      <span className="w-6 text-center">{s.qty}</span>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setQty(m.daily_menu_id, s.qty + 1)}>＋</Button>
                    </div>
                  </div>
                  {/* options (show when qty > 0) */}
                  {s.qty > 0 && m.option_groups.map((g) => {
                    const single = g.max_select <= 1
                    return (
                      <div key={g.id} className="pl-2 border-l-2 border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">{g.name}{g.is_required ? '（必須）' : ''}{single ? '' : '（複数可）'}</div>
                        <div className="flex flex-wrap gap-2">
                          {g.options.map((o) => {
                            const checked = !!s.options[g.id]?.has(o.id)
                            return (
                              <label key={o.id} className={`inline-flex items-center gap-1 text-sm border rounded-full px-3 py-1 cursor-pointer ${checked ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}>
                                <input type={single ? 'radio' : 'checkbox'} className="hidden" checked={checked}
                                  onChange={() => toggleOption(m.daily_menu_id, g.id, o.id, single)} />
                                {o.name}{o.price_delta ? ` +¥${o.price_delta}` : ''}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* customer form */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="部署 *" value={dept} onChange={(e) => setDept(e.target.value)} />
              <Input placeholder="お名前 *" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Input placeholder="お届け場所（席など）" value={loc} onChange={(e) => setLoc(e.target.value)} />
            <select className="w-full h-10 border border-gray-300 rounded px-2" value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">受け取り時間を選択 *</option>
              {slots.map((sl) => <option key={sl.value} value={sl.value} disabled={sl.disabled}>{sl.value}{sl.disabled ? '（締切）' : ''}</option>)}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* sticky footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="text-lg font-bold">合計 ¥{total.toLocaleString()}</div>
          <Button className="flex-1 bg-black text-white" disabled={!canSubmit} onClick={() => order.mutate()}>
            {order.isPending ? '送信中…' : '注文する'}
          </Button>
        </div>
      </div>
    </div>
  )
}
