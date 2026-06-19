import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save } from 'lucide-react'
import { apiClient, type CatProduct, type CatDailyMenu, type CatCategory, type CatTemplate } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { makeTodayWindow, todayJST } from '../lib/dateWindow'
import { toServeDateKey } from '../lib/dateUtils'
import { toast } from '../hooks/use-toast'

const WD = ['日', '月', '火', '水', '木', '金', '土']

export default function AdminCatalogPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const token = apiClient.getAdminToken()

  const windowDates = useMemo(() => makeTodayWindow(undefined, 7), [])
  const [dateKey, setDateKey] = useState<string>(() => toServeDateKey(todayJST(undefined)))

  // product master quick-add
  const [newProdName, setNewProdName] = useState('')
  const [newProdCat, setNewProdCat] = useState<string>('')
  const [newProdPrice, setNewProdPrice] = useState<number>(0)
  const [addProductId, setAddProductId] = useState<string>('')
  const [tplName, setTplName] = useState('')
  const [tplReplace, setTplReplace] = useState(true)
  const [showMaster, setShowMaster] = useState(false)

  const enabled = !!token
  const daily = useQuery({ queryKey: ['catDaily', dateKey], queryFn: () => apiClient.catListDailyMenus(dateKey), enabled })
  const products = useQuery({ queryKey: ['catProducts'], queryFn: () => apiClient.catListProducts(), enabled })
  const categories = useQuery({ queryKey: ['catCategories'], queryFn: () => apiClient.catListCategories(), enabled })
  const templates = useQuery({ queryKey: ['catTemplates'], queryFn: () => apiClient.catListTemplates(), enabled })

  const invalidateDaily = () => qc.invalidateQueries({ queryKey: ['catDaily', dateKey] })

  const addDaily = useMutation({
    mutationFn: (productId: number) => {
      const list = daily.data || []
      return apiClient.catCreateDailyMenu({ serve_date: dateKey, product_id: productId, max_qty: 30, sort_order: list.length })
    },
    onSuccess: () => { invalidateDaily(); setAddProductId('') },
    onError: (e: Error) => toast({ title: 'エラー', description: e.message, variant: 'destructive' }),
  })
  const updDaily = useMutation({
    mutationFn: (v: { id: number; body: Parameters<typeof apiClient.catUpdateDailyMenu>[1] }) => apiClient.catUpdateDailyMenu(v.id, v.body),
    onSuccess: invalidateDaily,
    onError: (e: Error) => toast({ title: 'エラー', description: e.message, variant: 'destructive' }),
  })
  const delDaily = useMutation({
    mutationFn: (id: number) => apiClient.catDeleteDailyMenu(id),
    onSuccess: invalidateDaily,
  })
  const createProduct = useMutation({
    mutationFn: () => apiClient.catCreateProduct({
      name: newProdName.trim(),
      category_id: newProdCat ? Number(newProdCat) : null,
      base_price: Number(newProdPrice) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catProducts'] })
      setNewProdName(''); setNewProdPrice(0)
      toast({ title: '商品を追加しました' })
    },
    onError: (e: Error) => toast({ title: 'エラー', description: e.message, variant: 'destructive' }),
  })
  const deleteProduct = useMutation({
    mutationFn: (id: number) => apiClient.catDeleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catProducts'] }),
    onError: (e: Error) => toast({ title: 'エラー', description: e.message, variant: 'destructive' }),
  })
  const saveTemplate = useMutation({
    mutationFn: () => {
      const list = daily.data || []
      return apiClient.catCreateTemplate({
        name: tplName.trim(),
        items: list.map((dm) => ({ product_id: dm.product_id, price_override: dm.price_override, max_qty: dm.max_qty, sort_order: dm.sort_order })),
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catTemplates'] }); setTplName(''); toast({ title: 'テンプレを保存しました' }) },
    onError: (e: Error) => toast({ title: 'エラー', description: e.message, variant: 'destructive' }),
  })
  const applyTemplate = useMutation({
    mutationFn: (id: number) => apiClient.catApplyTemplate(id, dateKey, tplReplace),
    onSuccess: () => { invalidateDaily(); toast({ title: 'テンプレを適用しました' }) },
    onError: (e: Error) => toast({ title: 'エラー', description: e.message, variant: 'destructive' }),
  })
  const deleteTemplate = useMutation({
    mutationFn: (id: number) => apiClient.catDeleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catTemplates'] }),
  })

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg">管理者権限が必要です</p>
          <Button onClick={() => apiClient.adminLogin()}>管理者としてログイン</Button>
          <div><Button variant="outline" onClick={() => navigate('/admin')}>旧管理画面へ</Button></div>
        </div>
      </div>
    )
  }

  const list = (daily.data || []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const usedProductIds = new Set(list.map((d) => d.product_id))
  const availableProducts = (products.data || []).filter((p) => p.is_active && !usedProductIds.has(p.id))
  const catName = (id: number | null) => (categories.data || []).find((c) => c.id === id)?.name || '—'

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= list.length) return
    const a = list[idx], b = list[target]
    updDaily.mutate({ id: a.id, body: { sort_order: b.sort_order } })
    updDaily.mutate({ id: b.id, body: { sort_order: a.sort_order } })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-lato tracking-wide">
            <span className="font-bold">CROWD LUNCH</span><span className="font-light"> 週次プランニング（新）</span>
          </h1>
          <span className="ml-auto text-xs text-gray-400">商品マスタ＋オプション対応版</span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Date tabs */}
        <div className="flex flex-wrap gap-2">
          {windowDates.map((d, i) => {
            const k = toServeDateKey(d)
            return (
              <Button key={i} variant={dateKey === k ? 'default' : 'outline'}
                className={`rounded-3xl ${dateKey === k ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black border-gray-300 hover:bg-gray-50'}`}
                onClick={() => setDateKey(k)}>
                {format(d, 'M/d')}({WD[d.getDay()]})
              </Button>
            )
          })}
        </div>

        {/* Daily menu editor */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>この日のメニュー（{dateKey}）</CardTitle></CardHeader>
          <CardContent>
            {/* Add product */}
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-md">
              <span className="text-sm font-medium text-gray-700">商品を追加</span>
              <select className="h-9 border border-gray-300 rounded px-2 text-sm min-w-[16rem]" value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}>
                <option value="">商品マスタから選択…</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>{catName(p.category_id)} / {p.name}（¥{p.base_price}）</option>
                ))}
              </select>
              <Button size="sm" disabled={!addProductId || addDaily.isPending}
                onClick={() => addDaily.mutate(Number(addProductId))}>
                <Plus className="h-4 w-4 mr-1" />追加
              </Button>
            </div>

            {/* Column headers */}
            <div className="flex gap-3 items-center mb-2 pb-2 border-b text-sm font-medium text-gray-700">
              <div className="flex-1">商品</div>
              <div className="w-24 text-center">価格</div>
              <div className="w-20 text-center">販売数</div>
              <div className="w-16 text-center">カフェ</div>
              <div className="w-10 text-center">順序</div>
              <div className="w-8"></div>
            </div>

            <div className="space-y-2">
              {list.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">メニューがありません。上で商品を追加するか、テンプレを適用してください。</p>}
              {list.map((dm, idx) => (
                <DailyRow key={dm.id} dm={dm} idx={idx} total={list.length} catName={catName}
                  onPrice={(v) => updDaily.mutate({ id: dm.id, body: { price_override: v === dm.product.base_price ? null : v } })}
                  onQty={(v) => updDaily.mutate({ id: dm.id, body: { max_qty: v } })}
                  onCafe={(v) => updDaily.mutate({ id: dm.id, body: { cafe_time_available: v } })}
                  onMove={(d) => move(idx, d)}
                  onDelete={() => delDaily.mutate(dm.id)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>テンプレート</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="テンプレ名（例: 金曜）" value={tplName} onChange={(e) => setTplName(e.target.value)} className="w-48 h-9" />
              <Button size="sm" variant="outline" disabled={!tplName.trim() || saveTemplate.isPending} onClick={() => saveTemplate.mutate()}>
                <Save className="h-4 w-4 mr-1" />この日をテンプレ保存
              </Button>
              <label className="flex items-center gap-1 text-sm text-gray-600 ml-2">
                <input type="checkbox" checked={tplReplace} onChange={(e) => setTplReplace(e.target.checked)} />既存を置き換えて適用
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(templates.data || []).length === 0 && <span className="text-sm text-muted-foreground">保存済みテンプレはありません</span>}
              {(templates.data || []).map((t: CatTemplate) => (
                <span key={t.id} className="inline-flex items-center gap-2 bg-white border rounded-full pl-3 pr-1 py-0.5 text-sm">
                  <button className="hover:underline" onClick={() => applyTemplate.mutate(t.id)}>{t.name}（{t.items.length}品）適用</button>
                  <button className="text-red-500 px-1" title="削除" onClick={() => deleteTemplate.mutate(t.id)}>×</button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product master */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>商品マスタ（{(products.data || []).length}）</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowMaster((v) => !v)}>{showMaster ? '閉じる' : '開く'}</Button>
            </div>
          </CardHeader>
          {showMaster && (
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">新規商品</span>
                <Input placeholder="商品名" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="w-56 h-9" />
                <select className="h-9 border border-gray-300 rounded px-2 text-sm" value={newProdCat} onChange={(e) => setNewProdCat(e.target.value)}>
                  <option value="">カテゴリ…</option>
                  {(categories.data || []).map((c: CatCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="number" placeholder="基準価格" value={newProdPrice} onChange={(e) => setNewProdPrice(parseInt(e.target.value) || 0)} className="w-28 h-9" />
                <Button size="sm" disabled={!newProdName.trim() || createProduct.isPending} onClick={() => createProduct.mutate()}>
                  <Plus className="h-4 w-4 mr-1" />追加
                </Button>
              </div>
              <div className="space-y-1">
                {(products.data || []).map((p: CatProduct) => (
                  <div key={p.id} className="flex items-center gap-3 text-sm border-b py-1">
                    <span className="w-28 text-gray-500">{catName(p.category_id)}</span>
                    <span className="flex-1">{p.name}</span>
                    <span className="w-20 text-right">¥{p.base_price}</span>
                    <span className="flex-1 text-xs text-gray-500">
                      {p.option_groups.map((g) => `${g.name}[${g.options.map((o) => `${o.name}+${o.price_delta}`).join(',')}]`).join(' ') || ''}
                    </span>
                    <button className="text-red-500" title="削除" onClick={() => { if (confirm(`「${p.name}」を削除しますか？`)) deleteProduct.mutate(p.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}

function DailyRow({ dm, idx, total, catName, onPrice, onQty, onCafe, onMove, onDelete }: {
  dm: CatDailyMenu; idx: number; total: number; catName: (id: number | null) => string
  onPrice: (v: number) => void; onQty: (v: number) => void; onCafe: (v: boolean) => void
  onMove: (d: -1 | 1) => void; onDelete: () => void
}) {
  const eff = dm.price_override ?? dm.product.base_price
  const [price, setPrice] = useState<number>(eff)
  const [qty, setQty] = useState<number>(dm.max_qty)
  return (
    <div className="flex gap-3 items-center">
      <div className="flex-1">
        <span className="text-xs text-gray-400 mr-2">{catName(dm.product.category_id)}</span>
        {dm.product.name}
        {dm.product.option_groups.length > 0 && (
          <span className="ml-2 text-xs text-blue-600">＋{dm.product.option_groups.map((g) => g.name).join('/')}</span>
        )}
      </div>
      <Input type="number" value={price} className="w-24 h-9"
        onChange={(e) => setPrice(parseInt(e.target.value) || 0)} onBlur={() => price !== eff && onPrice(price)} />
      <Input type="number" value={qty} className="w-20 h-9"
        onChange={(e) => setQty(parseInt(e.target.value) || 0)} onBlur={() => qty !== dm.max_qty && onQty(qty)} />
      <div className="w-16 flex justify-center">
        <Switch checked={dm.cafe_time_available} onCheckedChange={onCafe} />
      </div>
      <div className="w-10 flex flex-col items-center">
        <button disabled={idx === 0} onClick={() => onMove(-1)} className="text-gray-500 hover:text-gray-900 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
        <button disabled={idx === total - 1} onClick={() => onMove(1)} className="text-gray-500 hover:text-gray-900 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
      </div>
      <button className="w-8 text-red-500 hover:text-red-700" title="削除" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
    </div>
  )
}
