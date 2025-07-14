import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient, MenuSQLAlchemy } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { useAuth } from '../lib/auth'
import { ArrowLeft, Plus, Trash2, Edit, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateWeekdayDates, formatDateForApi, getTodayFormatted } from '../lib/dateUtils'

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
  const [selectedMenu, setSelectedMenu] = useState<MenuResponse | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([
    { name: '', price: 0, stock: 0 },
    { name: '', price: 0, stock: 0 },
    { name: '', price: 0, stock: 0 }
  ])
  const [menuImage, setMenuImage] = useState<string>('')
  const [isEditMode, setIsEditMode] = useState(true)
  const [savedMenuItems, setSavedMenuItems] = useState<MenuItemResponse[]>([])
  const [activeTab, setActiveTab] = useState('orders')
  const [newMenu, setNewMenu] = useState({
    title: '',
    price: 0,
    max_qty: 0
  })
  const [editingMenu, setEditingMenu] = useState<MenuSQLAlchemy | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null)

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

  const { data: sqlAlchemyMenus, isLoading: menusLoading, error: menusError } = useQuery({
    queryKey: ['menus-sqlalchemy', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getMenusSQLAlchemy(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com' && activeTab === 'menus',
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

  const createMenuSQLAlchemyMutation = useMutation({
    mutationFn: (menu: {
      serve_date: string;
      title: string;
      price: number;
      max_qty: number;
      img_url?: string;
    }) => apiClient.createMenuSQLAlchemy(menu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      setNewMenu({ title: '', price: 0, max_qty: 0 })
    },
    onError: (error) => {
      console.error('Failed to create menu:', error)
    }
  })

  const updateMenuSQLAlchemyMutation = useMutation({
    mutationFn: ({ id, menu }: { id: number; menu: {
      title?: string;
      price?: number;
      max_qty?: number;
      img_url?: string;
    } }) => 
      apiClient.updateMenuSQLAlchemy(id, menu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      setEditingMenu(null)
    },
    onError: (error) => {
      console.error('Failed to update menu:', error)
    }
  })

  const deleteMenuSQLAlchemyMutation = useMutation({
    mutationFn: (menuId: number) => apiClient.deleteMenuSQLAlchemy(menuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
    },
    onError: (error) => {
      console.error('Failed to delete menu:', error)
    }
  })

  const uploadBackgroundMutation = useMutation({
    mutationFn: ({ date, file }: { date: string; file: File }) => 
      apiClient.uploadBackgroundImage(date, file),
    onSuccess: (data) => {
      console.log('Background uploaded:', data)
      queryClient.invalidateQueries({ queryKey: ['menus-sqlalchemy'] })
      setBackgroundImage(null)
    },
    onError: (error) => {
      console.error('Failed to upload background:', error)
    }
  })

  const updateMenuMutation = useMutation({
    mutationFn: ({ menuId, menu }: { menuId: number; menu: { title?: string; photo_url?: string } }) => 
      apiClient.updateMenu(menuId, menu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      resetMenuForm()
    }
  })

  const resetMenuForm = () => {
    setSelectedMenu(null)
    setMenuItems([
      { name: '', price: 0, stock: 0 },
      { name: '', price: 0, stock: 0 },
      { name: '', price: 0, stock: 0 }
    ])
    setMenuImage('')
    setIsEditMode(true)
    setSavedMenuItems([])
  }

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
    if (menuItems.length > 3) {
      setMenuItems(menuItems.filter((_, i) => i !== index))
    }
  }

  const updateMenuItem = (index: number, field: string, value: string | number) => {
    const updated = [...menuItems]
    updated[index] = { ...updated[index], [field]: value }
    setMenuItems(updated)
  }

  const saveMenu = () => {
    const menuData = {
      date: formatDateForApi(selectedDate),
      title: `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}のメニュー`,
      photo_url: menuImage
    }

    if (selectedMenu) {
      updateMenuMutation.mutate({ menuId: selectedMenu.id, menu: menuData })
    } else {
      createMenuMutation.mutate(menuData)
    }
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
        {/* Date Selection */}
        <div className="flex flex-wrap gap-2 pb-2">
          {weekdayDates.map((dateInfo, index) => (
            <Button
              key={index}
              variant={selectedDate.toDateString() === dateInfo.date.toDateString() ? "default" : "outline"}
              className="rounded-3xl"
              onClick={() => {
                setSelectedDate(dateInfo.date)
              }}
            >
              {dateInfo.formatted}({dateInfo.dayName})
            </Button>
          ))}
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">注文管理</TabsTrigger>
            <TabsTrigger value="menus">メニュー管理</TabsTrigger>
          </TabsList>

          {/* Orders Tab Content */}
          <TabsContent value="orders" className="space-y-6">
            {/* Legacy Menu Management - Keep for backward compatibility */}
            <Card>
              <CardHeader>
                <CardTitle>メニュー構成 (旧システム)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-6">
                  {/* Image Upload - Circular */}
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-medium mb-2">画像登録</label>
                    <div 
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {menuImage ? (
                        <img src={menuImage} alt="Menu" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="text-center">
                          <div className="text-xs text-gray-500">画像を</div>
                          <div className="text-xs text-gray-500">選択</div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>

                  {/* Menu Items Table */}
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2 text-sm font-medium">
                      <div className="flex-1">メニュー情報</div>
                      <div className="w-20 text-center">金額</div>
                      <div className="w-20 text-center">販売数</div>
                      <div className="w-8"></div>
                      <div className="w-8"></div>
                    </div>
                    
                    {isEditMode ? (
                      menuItems.map((item, index) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                          <Input
                            placeholder="メニュー名"
                            value={item.name}
                            onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                            className="text-sm flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.price}
                            onChange={(e) => updateMenuItem(index, 'price', parseInt(e.target.value) || 0)}
                            className="text-sm text-center w-20"
                          />
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.stock}
                            onChange={(e) => updateMenuItem(index, 'stock', parseInt(e.target.value) || 0)}
                            className="text-sm text-center w-20"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={enterEditMode}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {index >= 3 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMenuItem(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="w-8"></div>
                          )}
                        </div>
                      ))
                    ) : (
                      savedMenuItems.map((item, index) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                          <div className="text-sm flex-1 p-2 bg-gray-50 rounded border">
                            {item.name}
                          </div>
                          <div className="text-sm text-center w-20 p-2 bg-gray-50 rounded border">
                            {item.price}
                          </div>
                          <div className="text-sm text-center w-20 p-2 bg-gray-50 rounded border">
                            {item.stock}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={enterEditMode}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <div className="w-8"></div>
                        </div>
                      ))
                    )}
                    
                    {isEditMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addMenuItem}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        メニュー追加
                      </Button>
                    )}
                  </div>
                </div>

                {isEditMode && (
                  <Button onClick={saveMenu} className="w-full bg-black text-white hover:bg-gray-800">
                    保存
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Order Table */}
            <Card>
              <CardHeader>
                <CardTitle>注文一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders?.length ? (
                    orders.map((order: Order) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-semibold">
                              注文ID: #{order.id.toString().padStart(3, '0')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), 'HH:mm')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{order.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.request_time || '時間指定なし'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {order.order_items?.map((item: OrderItem) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{item.menu_item_name || item.menu.title}</span>
                                <span className="text-sm text-muted-foreground">× {item.qty}</span>
                              </div>
                              <div className="font-semibold">
                                ¥{item.menu.price * item.qty}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                          <div className="text-sm text-muted-foreground">
                            合計金額
                          </div>
                          <div className="text-lg font-bold">
                            ¥{order.total_price}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      注文がありません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menus Tab Content */}
          <TabsContent value="menus" className="space-y-6">
            {/* Background Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>背景画像アップロード</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBackgroundImage(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (backgroundImage) {
                        uploadBackgroundMutation.mutate({
                          date: formatDateForApi(selectedDate),
                          file: backgroundImage
                        })
                      }
                    }}
                    disabled={!backgroundImage || uploadBackgroundMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadBackgroundMutation.isPending ? 'アップロード中...' : 'アップロード'}
                  </Button>
                </div>
                {uploadBackgroundMutation.error && (
                  <p className="text-red-500 text-sm mt-2">
                    エラー: {uploadBackgroundMutation.error.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Menu Creation Form */}
            <Card>
              <CardHeader>
                <CardTitle>新しいメニューを追加</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">タイトル</label>
                    <Input
                      placeholder="メニュー名"
                      value={newMenu.title}
                      onChange={(e) => setNewMenu({ ...newMenu, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">価格</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newMenu.price}
                      onChange={(e) => setNewMenu({ ...newMenu, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">販売数</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newMenu.max_qty}
                      onChange={(e) => setNewMenu({ ...newMenu, max_qty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    createMenuSQLAlchemyMutation.mutate({
                      serve_date: formatDateForApi(selectedDate),
                      title: newMenu.title,
                      price: newMenu.price,
                      max_qty: newMenu.max_qty
                    })
                  }}
                  disabled={!newMenu.title || createMenuSQLAlchemyMutation.isPending}
                  className="w-full"
                >
                  {createMenuSQLAlchemyMutation.isPending ? '作成中...' : 'メニューを追加'}
                </Button>
                {createMenuSQLAlchemyMutation.error && (
                  <p className="text-red-500 text-sm mt-2">
                    エラー: {createMenuSQLAlchemyMutation.error.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Menu List */}
            <Card>
              <CardHeader>
                <CardTitle>メニュー一覧</CardTitle>
              </CardHeader>
              <CardContent>
                {menusLoading ? (
                  <div className="text-center py-8">読み込み中...</div>
                ) : menusError ? (
                  <div className="text-red-500 text-center py-8">
                    エラー: {menusError.message}
                  </div>
                ) : sqlAlchemyMenus?.length ? (
                  <div className="space-y-4">
                    {sqlAlchemyMenus.map((menu) => (
                      <div key={menu.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        {editingMenu?.id === menu.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                              value={editingMenu.title}
                              onChange={(e) => setEditingMenu({ ...editingMenu, title: e.target.value })}
                              placeholder="タイトル"
                            />
                            <Input
                              type="number"
                              value={editingMenu.price}
                              onChange={(e) => setEditingMenu({ ...editingMenu, price: parseInt(e.target.value) || 0 })}
                              placeholder="価格"
                            />
                            <Input
                              type="number"
                              value={editingMenu.max_qty}
                              onChange={(e) => setEditingMenu({ ...editingMenu, max_qty: parseInt(e.target.value) || 0 })}
                              placeholder="販売数"
                            />
                            <div className="flex gap-2 md:col-span-3">
                              <Button
                                onClick={() => {
                                  updateMenuSQLAlchemyMutation.mutate({
                                    id: editingMenu.id,
                                    menu: {
                                      title: editingMenu.title,
                                      price: editingMenu.price,
                                      max_qty: editingMenu.max_qty
                                    }
                                  })
                                }}
                                disabled={updateMenuSQLAlchemyMutation.isPending}
                                size="sm"
                              >
                                {updateMenuSQLAlchemyMutation.isPending ? '更新中...' : '保存'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setEditingMenu(null)}
                                size="sm"
                              >
                                キャンセル
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className="font-semibold">{menu.title}</div>
                              <div className="text-sm text-muted-foreground">¥{menu.price}</div>
                              <div className="text-sm text-muted-foreground">販売数: {menu.max_qty}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingMenu(menu)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm('このメニューを削除しますか？')) {
                                    deleteMenuSQLAlchemyMutation.mutate(menu.id)
                                  }
                                }}
                                disabled={deleteMenuSQLAlchemyMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    まだメニューが登録されていません
                  </div>
                )}
                {updateMenuSQLAlchemyMutation.error && (
                  <p className="text-red-500 text-sm mt-2">
                    更新エラー: {updateMenuSQLAlchemyMutation.error.message}
                  </p>
                )}
                {deleteMenuSQLAlchemyMutation.error && (
                  <p className="text-red-500 text-sm mt-2">
                    削除エラー: {deleteMenuSQLAlchemyMutation.error.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
