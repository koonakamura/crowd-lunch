import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient, type MenuSQLAlchemy } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuth } from '../lib/auth'
import { ArrowLeft, Plus, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateWeekdayDates, formatDateForApi, getTodayFormatted } from '../lib/dateUtils'

interface Order {
  id: number
  user_id: number
  total_price: number
  status: string
  created_at: string
  request_time?: string
  user: { name: string }
  order_items: OrderItem[]
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
  const [menuRows, setMenuRows] = useState([
    { title: '', price: 0, max_qty: 0 },
    { title: '', price: 0, max_qty: 0 },
    { title: '', price: 0, max_qty: 0 }
  ])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

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
      let imgUrl = ''
      if (selectedImage) {
        const uploadResult = await apiClient.uploadBackgroundImage(formatDateForApi(selectedDate), selectedImage)
        imgUrl = uploadResult.img_url
      }

      const validRows = menuRows.filter(row => row.title.trim() !== '')
      const promises = validRows.map(row => 
        apiClient.createMenuSQLAlchemy({
          serve_date: formatDateForApi(selectedDate),
          title: row.title,
          price: row.price,
          max_qty: row.max_qty,
          img_url: imgUrl
        })
      )
      
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      setSelectedImage(null)
      setImagePreview('')
      setMenuRows([
        { title: '', price: 0, max_qty: 0 },
        { title: '', price: 0, max_qty: 0 },
        { title: '', price: 0, max_qty: 0 }
      ])
    },
    onError: (error) => {
      console.error('Failed to save menus:', error)
    }
  })


  useEffect(() => {
    if (sqlAlchemyMenus && sqlAlchemyMenus.length > 0) {
      const newRows = [...menuRows]
      sqlAlchemyMenus.forEach((menu, index) => {
        if (index < newRows.length) {
          newRows[index] = {
            title: menu.title,
            price: menu.price,
            max_qty: menu.max_qty
          }
        }
      })
      setMenuRows(newRows)
      
      const firstMenuWithImage = sqlAlchemyMenus.find(menu => menu.img_url)
      if (firstMenuWithImage?.img_url) {
        setImagePreview(firstMenuWithImage.img_url.startsWith('/static/uploads/') 
          ? `${(import.meta as any).env?.VITE_API_URL || 'https://app-toquofbw.fly.dev'}${firstMenuWithImage.img_url}`
          : firstMenuWithImage.img_url
        )
      }
    } else {
      setMenuRows([
        { title: '', price: 0, max_qty: 0 },
        { title: '', price: 0, max_qty: 0 },
        { title: '', price: 0, max_qty: 0 }
      ])
      setImagePreview('')
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
                } catch (error) {
                  console.error('Admin login failed:', error);
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const addMenuRow = () => {
    setMenuRows([...menuRows, { title: '', price: 0, max_qty: 0 }])
  }

  const updateMenuRow = (index: number, field: keyof typeof menuRows[0], value: string | number) => {
    const updated = [...menuRows]
    updated[index] = { ...updated[index], [field]: value }
    setMenuRows(updated)
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
                <div 
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Menu background" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-sm">画像を</div>
                      <div className="text-sm">選択</div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Menu Rows */}
              <div className="flex-1">
                <div className="space-y-3">
                  {menuRows.map((row, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        placeholder="メニュー名"
                        value={row.title}
                        onChange={(e) => updateMenuRow(index, 'title', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="金額"
                        value={row.price}
                        onChange={(e) => updateMenuRow(index, 'price', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Input
                        type="number"
                        placeholder="数量"
                        value={row.max_qty}
                        onChange={(e) => updateMenuRow(index, 'max_qty', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
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
              disabled={saveMenusMutation.isPending}
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
                        <td className="p-2">#{order.id.toString().padStart(7, '0')}</td>
                        <td className="p-2">{format(new Date(order.created_at), 'MM/dd HH:mm')}</td>
                        <td className="p-2">{order.user.name}</td>
                        <td className="p-2">
                          {order.order_items?.map((item: OrderItem) => (
                            <div key={item.id}>
                              {item.menu_item_name || item.menu.title} × {item.qty}
                            </div>
                          ))}
                        </td>
                        <td className="p-2">¥{order.total_price}</td>
                        <td className="p-2">{order.request_time || '時間指定なし'}</td>
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
    </div>
  )
}
