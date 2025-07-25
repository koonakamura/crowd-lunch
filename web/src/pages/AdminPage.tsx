import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient, type MenuSQLAlchemy } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useAuth } from '../lib/auth'

interface MenuRow {
  id: number | null;
  title: string;
  price: number;
  max_qty: number;
}
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateWeekdayDates, formatDateForApi, getTodayFormatted } from '../lib/dateUtils'
import { toast } from '../hooks/use-toast'

interface Order {
  id: number
  user_id: number
  total_price: number
  status: string
  created_at: string
  request_time?: string
  user: { name: string }
  order_items: OrderItem[]
  order_id?: string
}

interface OrderItem {
  id: number
  menu: { title: string; price: number }
  qty: number
  menu_item_name?: string
}

export default function AdminPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [menuRows, setMenuRows] = useState<MenuRow[]>([
    { id: null, title: '', price: 0, max_qty: 0 },
    { id: null, title: '', price: 0, max_qty: 0 },
    { id: null, title: '', price: 0, max_qty: 0 }
  ])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [menuToDelete, setMenuToDelete] = useState<{ index: number; menu: MenuRow } | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const weekdayDates = generateWeekdayDates(new Date(), 10)

  const { data: orders } = useQuery<Order[]>({
    queryKey: ['orders', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getOrdersByDate(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })

  const { data: sqlAlchemyMenus } = useQuery<MenuSQLAlchemy[]>({
    queryKey: ['menus-sqlalchemy', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getMenusSQLAlchemy(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })


  const saveMenusMutation = useMutation({
    mutationFn: async () => {
      const validRows = menuRows.filter((row: MenuRow) => row.title.trim() !== '')
      const promises = validRows.map((row: MenuRow) => {
        if (row.id) {
          return apiClient.updateMenuSQLAlchemyWithImage(row.id, {
            title: row.title,
            price: row.price,
            max_qty: row.max_qty
          }, selectedImage)
        } else {
          return apiClient.createMenuSQLAlchemyWithImage({
            serve_date: formatDateForApi(selectedDate),
            title: row.title,
            price: row.price,
            max_qty: row.max_qty
          }, selectedImage)
        }
      })
      
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      queryClient.invalidateQueries({ queryKey: ['menus', 'weekly'] })
      setSelectedImage(null)
      setBackgroundPreview(null)
      setMenuRows([
        { id: null, title: '', price: 0, max_qty: 0 },
        { id: null, title: '', price: 0, max_qty: 0 },
        { id: null, title: '', price: 0, max_qty: 0 }
      ])
      toast({
        title: "成功",
        description: "メニューが正常に保存されました",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: `保存に失敗しました: ${error.message}`,
        variant: "destructive",
      })
    }
  })

  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return apiClient.deleteMenuSQLAlchemy(menuId)
    },
    onSuccess: (_, menuId) => {
      setMenuRows(prevRows => prevRows.map(row => 
        row.id === menuId ? { id: null, title: '', price: 0, max_qty: 0 } : row
      ))
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      queryClient.invalidateQueries({ queryKey: ['menus', 'weekly'] })
    },
    onError: () => {
    }
  })

  const updateMenuMutation = useMutation({
    mutationFn: async ({ menuId, menuData }: { menuId: number, menuData: Partial<MenuSQLAlchemy> }) => {
      return apiClient.updateMenuSQLAlchemy(menuId, menuData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      queryClient.invalidateQueries({ queryKey: ['menus', 'weekly'] })
    },
    onError: () => {
    }
  })


  useEffect(() => {
    if (sqlAlchemyMenus && sqlAlchemyMenus.length > 0) {
      const newRows: MenuRow[] = [
        { id: null, title: '', price: 0, max_qty: 0 },
        { id: null, title: '', price: 0, max_qty: 0 },
        { id: null, title: '', price: 0, max_qty: 0 }
      ]
      sqlAlchemyMenus.forEach((menu: MenuSQLAlchemy, index: number) => {
        if (index < newRows.length) {
          newRows[index] = {
            id: menu.id,
            title: menu.title,
            price: menu.price,
            max_qty: menu.max_qty
          }
        }
      })
      setMenuRows(newRows)
      
      const firstMenuWithImage = sqlAlchemyMenus.find(menu => menu.img_url)
      if (firstMenuWithImage?.img_url) {
        const apiUrl = import.meta.env?.VITE_API_URL as string || 'https://crowd-lunch.fly.dev'
        setBackgroundPreview(firstMenuWithImage.img_url.startsWith('/static/uploads/') 
          ? `${apiUrl}${firstMenuWithImage.img_url}`
          : firstMenuWithImage.img_url
        )
      }
    } else {
      setMenuRows([
        { id: null, title: '', price: 0, max_qty: 0 },
        { id: null, title: '', price: 0, max_qty: 0 },
        { id: null, title: '', price: 0, max_qty: 0 }
      ])
      setBackgroundPreview(null)
    }
  }, [sqlAlchemyMenus])

  if (user?.email !== 'admin@example.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg mb-4">管理者権限が必要です</p>
          <div className="space-y-2">
            <Button 
              onClick={async () => {
                try {
                  await login('admin@example.com');
                } catch {
                  // Login errors are handled silently
                }
              }}
              className="w-full"
            >
              管理者としてログイン
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>ホームに戻る</Button>
          </div>
        </div>
      </div>
    )
  }


  const addMenuRow = () => {
    setMenuRows([...menuRows, { id: null, title: '', price: 0, max_qty: 0 }])
  }

  const handleDeleteMenu = (index: number) => {
    const menu = menuRows[index]
    setMenuToDelete({ index, menu })
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteMenu = () => {
    if (!menuToDelete) return
    
    const { index, menu } = menuToDelete
    
    if (menu.id) {
      deleteMenuMutation.mutate(menu.id)
    } else {
      const updated = menuRows.filter((_, i) => i !== index)
      setMenuRows(updated)
    }
    
    setDeleteConfirmOpen(false)
    setMenuToDelete(null)
  }

  const handleEditMenu = (index: number) => {
    const menu = menuRows[index]
    if (menu.id && menu.title.trim()) {
      updateMenuMutation.mutate({
        menuId: menu.id,
        menuData: {
          title: menu.title,
          price: menu.price,
          max_qty: menu.max_qty
        }
      })
    }
  }

  const validateMenuRow = (field: 'price' | 'max_qty', value: string): string | null => {
    const numValue = parseFloat(value)
    
    if (isNaN(numValue)) {
      return field === 'price' ? '価格は数値で入力してください' : '数量は数値で入力してください'
    }
    
    if (numValue < 0) {
      return field === 'price' ? '価格は0以上で入力してください' : '数量は0以上で入力してください'
    }
    
    if (!Number.isInteger(numValue)) {
      return field === 'price' ? '価格は整数で入力してください' : '数量は整数で入力してください'
    }
    
    if (field === 'price' && numValue > 10000) {
      return '価格は10,000円以下で入力してください'
    }
    
    if (field === 'max_qty' && numValue > 100) {
      return '数量は100個以下で入力してください'
    }
    
    return null
  }

  const updateMenuRow = (index: number, field: keyof MenuRow, value: string | number) => {
    const updated = [...menuRows]
    updated[index] = { ...updated[index], [field]: value }
    setMenuRows(updated)
    
    if (field === 'price' || field === 'max_qty') {
      const error = validateMenuRow(field, value.toString())
      const errorKey = `${index}-${field}`
      
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        if (error) {
          newErrors[errorKey] = error
        } else {
          delete newErrors[errorKey]
        }
        return newErrors
      })
    }
  }

  const handleSave = () => {
    saveMenusMutation.mutate()
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-lato">
            <span className="font-bold">CROWD LUNCH</span>
            <span className="font-light"> Order sheet</span>
          </h1>
          <span className="text-sm text-muted-foreground ml-4">
            {getTodayFormatted()}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Date Selection - Round Buttons */}
        <div className="flex flex-wrap gap-2 pb-2">
          {weekdayDates.map((dateInfo, index) => (
            <Button
              key={index}
              variant={selectedDate.toDateString() === dateInfo.date.toDateString() ? "default" : "outline"}
              className={`rounded-3xl ${
                selectedDate.toDateString() === dateInfo.date.toDateString() 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedDate(dateInfo.date)}
            >
              {dateInfo.formatted}({dateInfo.dayName})
            </Button>
          ))}
        </div>

        {/* Menu Configuration Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>メニュー構成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {/* Circular Image Upload Area */}
              <div className="flex flex-col items-center">
                {/* ラベルタグでプレビューと input をまとめてクリック可能に */}
                <label htmlFor="bg-upload" className="relative w-32 h-32 cursor-pointer">
                  {backgroundPreview ? (
                    <img
                      src={backgroundPreview}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-500">画像を選択</span>
                    </div>
                  )}
                  <input
                    id="bg-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={e => {
                      const file = e.target.files![0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setBackgroundPreview(previewUrl);
                        setSelectedImage(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Menu Rows */}
              <div className="flex-1" style={{ pointerEvents: 'auto' }}>
                <div className="space-y-3">
                  {menuRows.map((row, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        placeholder="メニュー名"
                        value={row.title}
                        onChange={(e) => updateMenuRow(index, 'title', e.target.value)}
                        className="flex-1"
                      />
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="金額"
                          value={row.price}
                          onChange={(e) => updateMenuRow(index, 'price', parseInt(e.target.value) || 0)}
                          className={`w-24 ${validationErrors[`${index}-price`] ? 'border-red-500' : ''}`}
                        />
                        {validationErrors[`${index}-price`] && (
                          <p className="text-sm text-red-500">{validationErrors[`${index}-price`]}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="数量"
                          value={row.max_qty}
                          onChange={(e) => updateMenuRow(index, 'max_qty', parseInt(e.target.value) || 0)}
                          className={`w-24 ${validationErrors[`${index}-max_qty`] ? 'border-red-500' : ''}`}
                        />
                        {validationErrors[`${index}-max_qty`] && (
                          <p className="text-sm text-red-500">{validationErrors[`${index}-max_qty`]}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditMenu(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteMenu(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add Menu Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addMenuRow}
                    className="w-full mt-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    メニュー追加
                  </Button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSave}
              disabled={saveMenusMutation.isPending || Object.keys(validationErrors).length > 0}
              className="w-full mt-6 bg-black text-white hover:bg-gray-800"
            >
              {saveMenusMutation.isPending ? '保存中...' : '保存'}
            </Button>
            
            {saveMenusMutation.error && (
              <p className="text-red-500 text-sm mt-2">
                エラー: {saveMenusMutation.error.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Order List Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>注文一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">注文ID</th>
                    <th className="text-left p-2">注文時間</th>
                    <th className="text-left p-2">注文者</th>
                    <th className="text-left p-2">メニュー</th>
                    <th className="text-left p-2">金額</th>
                    <th className="text-left p-2">配達時間</th>
                  </tr>
                </thead>
                <tbody>
                  {orders?.length ? (
                    orders.map((order: Order) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-2">{order.order_id || `#${order.id.toString().padStart(7, '0')}`}</td>
                        <td className="p-2">{format(new Date(order.created_at), 'MM/dd HH:mm')}</td>
                        <td className="p-2">{order.user.name}</td>
                        <td className="p-2">{order.order_items.map(item => item.menu.title).join('、')}</td>
                        <td className="p-2">{order.total_price.toLocaleString()}円</td>
                        <td className="p-2">{order.request_time || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8">
                        注文がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メニューを削除</DialogTitle>
            <DialogDescription>
              「{menuToDelete?.menu.title || ''}」を削除してもよろしいですか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMenu}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
