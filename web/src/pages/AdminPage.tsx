import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuth } from '../lib/auth'
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateWeekdayDates, formatDateForApi } from '../lib/dateUtils'

interface MenuItemData {
  name: string
  price: number
  stock: number
}

interface MenuResponse {
  id: number
  date: string
  title: string
  photo_url?: string
  items: MenuItemResponse[]
}

interface MenuItemResponse {
  id: number
  menu_id: number
  name: string
  price: number
  stock: number
}

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
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([
    { name: '', price: 0, stock: 0 },
    { name: '', price: 0, stock: 0 },
    { name: '', price: 0, stock: 0 }
  ])
  const [menuImage, setMenuImage] = useState<string>('')
  const [isEditMode, setIsEditMode] = useState(true)
  const [savedMenuItems, setSavedMenuItems] = useState<MenuItemResponse[]>([])

  const weekdayDates = generateWeekdayDates(new Date(), 10)

  const { data: orders } = useQuery<Order[]>({
    queryKey: ['orders', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getOrdersByDate(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })

  const { data: existingMenus } = useQuery<MenuResponse[]>({
    queryKey: ['menus', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getMenus(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadImage(file),
    onSuccess: (data) => {
      setMenuImage(data.file_url)
    }
  })

  const createMenuMutation = useMutation({
    mutationFn: (menu: { date: string; title: string; photo_url?: string }) => apiClient.createMenu(menu),
    onSuccess: async (data) => {
      const menuId = data.id
      const validItems = menuItems.filter(item => item.name.trim() !== '')
      
      if (validItems.length > 0) {
        try {
          console.log('Creating menu items for menuId:', menuId, 'items:', validItems)
          const results = await Promise.all(validItems.map(async (item, index) => {
            console.log(`Creating menu item ${index + 1}:`, item)
            try {
              const result = await apiClient.createMenuItem(menuId, {
                name: item.name,
                price: item.price,
                stock: item.stock
              })
              console.log(`Menu item ${index + 1} created successfully:`, result)
              return result
            } catch (itemError) {
              console.error(`Failed to create menu item ${index + 1}:`, itemError)
              throw itemError
            }
          }))
          console.log('All menu items created successfully:', results)
        } catch (error) {
          console.error('Failed to create menu items:', error)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['menus', formatDateForApi(selectedDate)] })
      setSavedMenuItems(validItems as MenuItemResponse[])
      setIsEditMode(false)
    }
  })


  const enterEditMode = () => {
    setIsEditMode(true)
    if (savedMenuItems.length > 0) {
      setMenuItems(savedMenuItems.map(item => ({
        name: item.name,
        price: item.price,
        stock: item.stock
      })))
    }
  }

  useEffect(() => {
    console.log('existingMenus data:', existingMenus)
    if (existingMenus && existingMenus.length > 0) {
      const menu = existingMenus[0]
      console.log('menu structure:', menu)
      setMenuImage(menu.photo_url || '')
      if (menu.items && menu.items.length > 0) {
        console.log('Found menu items:', menu.items)
        setSavedMenuItems(menu.items)
        setIsEditMode(false)
      } else {
        console.log('No menu items found, entering edit mode')
        setSavedMenuItems([])
        setIsEditMode(true)
      }
    } else {
      console.log('No existing menus found')
      setSavedMenuItems([])
      setIsEditMode(true)
      setMenuImage('')
    }
  }, [existingMenus])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadImageMutation.mutate(file)
    }
  }

  const addMenuItem = () => {
    setMenuItems([...menuItems, { name: '', price: 0, stock: 0 }])
  }

  const removeMenuItem = (index: number) => {
    if (menuItems.length > 1) {
      setMenuItems(menuItems.filter((_, i) => i !== index))
    }
  }

  const updateMenuItem = (index: number, field: keyof MenuItemData, value: string | number) => {
    const updatedItems = [...menuItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setMenuItems(updatedItems)
  }

  const saveMenu = async () => {
    const menuData = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      title: `${format(selectedDate, 'M/d')}のメニュー`,
      photo_url: menuImage
    }
    
    createMenuMutation.mutate(menuData)
  }

  if (!user || user.email !== 'admin@example.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>管理者ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => login('admin@example.com')} className="w-full">
              管理者としてログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">CROWD LUNCH Order sheet</h1>
            </div>
            <div className="text-sm text-gray-600">
              {format(selectedDate, 'yyyy/M/d')}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {weekdayDates.map((dateInfo) => (
              <Button
                key={dateInfo.date.toISOString()}
                variant={format(selectedDate, 'yyyy-MM-dd') === format(dateInfo.date, 'yyyy-MM-dd') ? 'default' : 'outline'}
                onClick={() => setSelectedDate(dateInfo.date)}
                className="rounded-full px-4 py-2"
              >
                {dateInfo.formatted}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>注文一覧</CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{order.user.name}</p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(order.created_at), 'HH:mm')}
                            </p>
                            {order.request_time && (
                              <p className="text-sm text-gray-600">
                                希望時間: {order.request_time}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">¥{order.total_price}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.menu_item_name || item.menu.title} × {item.qty}
                              </span>
                              <span>¥{item.menu.price * item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">注文がありません</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>メニュー管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">メニュー画像</label>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      画像をアップロード
                    </Button>
                    {menuImage && (
                      <div className="mt-2">
                        <img
                          src={menuImage.startsWith('/static/uploads/') 
                            ? `${import.meta.env.VITE_API_URL || 'https://app-toquofbw.fly.dev'}${menuImage}`
                            : menuImage
                          }
                          alt="Menu"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium">メニュー項目</label>
                    {isEditMode && (
                      <Button onClick={addMenuItem} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        項目追加
                      </Button>
                    )}
                  </div>

                  {isEditMode ? (
                    <div className="space-y-3">
                      {menuItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="メニュー名"
                            value={item.name}
                            onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="価格"
                            value={item.price || ''}
                            onChange={(e) => updateMenuItem(index, 'price', parseInt(e.target.value) || 0)}
                            className="w-24"
                          />
                          <Input
                            type="number"
                            placeholder="在庫"
                            value={item.stock || ''}
                            onChange={(e) => updateMenuItem(index, 'stock', parseInt(e.target.value) || 0)}
                            className="w-24"
                          />
                          {menuItems.length > 1 && (
                            <Button
                              onClick={() => removeMenuItem(index)}
                              size="sm"
                              variant="outline"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedMenuItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">¥{item.price}</div>
                            <div className="text-sm text-gray-600">在庫: {item.stock}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {isEditMode ? (
                    <Button onClick={saveMenu} className="flex-1">
                      保存
                    </Button>
                  ) : (
                    <Button onClick={enterEditMode} variant="outline" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      編集
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
