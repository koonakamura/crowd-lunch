import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../lib/auth'
import { ArrowLeft, Plus, Trash2, Upload, Camera } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateWeekdayDates, formatDateForApi, getTodayFormatted } from '../lib/dateUtils'

export default function AdminPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedMenu, setSelectedMenu] = useState<any>(null)
  const [menuItems, setMenuItems] = useState([
    { name: '', price: 0, stock: 0 },
    { name: '', price: 0, stock: 0 },
    { name: '', price: 0, stock: 0 }
  ])
  const [menuImage, setMenuImage] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const weekdayDates = generateWeekdayDates(new Date(), 10)

  const { data: menus } = useQuery({
    queryKey: ['menus', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getMenus(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })

  const { data: orders } = useQuery({
    queryKey: ['orders', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getOrdersByDate(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadImage(file),
    onSuccess: (data) => {
      setMenuImage(data.file_url)
      setIsUploading(false)
    },
    onError: () => {
      setIsUploading(false)
    }
  })

  const createMenuMutation = useMutation({
    mutationFn: (menu: any) => apiClient.createMenu(menu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      resetMenuForm()
    }
  })

  const updateMenuMutation = useMutation({
    mutationFn: ({ menuId, menu }: { menuId: number; menu: any }) => 
      apiClient.updateMenu(menuId, menu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      resetMenuForm()
    }
  })


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

  const resetMenuForm = () => {
    setSelectedMenu(null)
    setMenuItems([
      { name: '', price: 0, stock: 0 },
      { name: '', price: 0, stock: 0 },
      { name: '', price: 0, stock: 0 }
    ])
    setMenuImage('')
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)
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

  const updateMenuItem = (index: number, field: string, value: any) => {
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

  const currentMenu = menus?.[0]
  const totalOrdered = currentMenu?.items?.reduce((sum: number, item: any) => 
    sum + (item.stock - (orders?.reduce((itemSum: number, order: any) => 
      itemSum + (order.order_items?.filter((oi: any) => oi.menu_id === item.id)
        .reduce((qty: number, oi: any) => qty + oi.qty, 0) || 0), 0) || 0)), 0) || 0
  const totalStock = currentMenu?.items?.reduce((sum: number, item: any) => sum + item.stock, 0) || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold font-lato">
              CROWD LUNCH Order sheet
            </h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {getTodayFormatted()}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Date Selection */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekdayDates.map((dateInfo, index) => (
            <Button
              key={index}
              variant={selectedDate.toDateString() === dateInfo.date.toDateString() ? "default" : "outline"}
              className="flex-shrink-0 rounded-3xl"
              onClick={() => setSelectedDate(dateInfo.date)}
            >
              {dateInfo.formatted}({dateInfo.dayName})
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Menu Management */}
          <Card>
            <CardHeader>
              <CardTitle>メニュー構成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">画像登録</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {menuImage ? (
                    <div className="relative">
                      <img src={menuImage} alt="Menu" className="w-full h-32 object-cover rounded" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-gray-400" />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? '画像をアップロード中...' : '画像を選択'}
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                <label className="text-sm font-medium">メニュー情報</label>
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
                      placeholder="金額"
                      value={item.price}
                      onChange={(e) => updateMenuItem(index, 'price', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="数量"
                      value={item.stock}
                      onChange={(e) => updateMenuItem(index, 'stock', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    {index >= 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeMenuItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMenuItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  メニュー追加
                </Button>
              </div>

              <Button onClick={saveMenu} className="w-full">
                保存
              </Button>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>数量: {totalOrdered} / {totalStock}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentMenu?.items?.map((item: any) => {
                const orderedQty = orders?.reduce((sum: number, order: any) => 
                  sum + (order.order_items?.filter((oi: any) => oi.menu_id === item.id)
                    .reduce((qty: number, oi: any) => qty + oi.qty, 0) || 0), 0) || 0
                
                return (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b">
                    <span>・{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{item.price}円</span>
                      <Badge variant="outline">
                        {orderedQty}/{item.stock}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Order Table */}
        <Card>
          <CardHeader>
            <CardTitle>注文一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>注文ID</TableHead>
                  <TableHead>注文時間</TableHead>
                  <TableHead>注文者情報</TableHead>
                  <TableHead>注文品目</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>希望配達時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order: any) => (
                  order.order_items?.map((item: any) => (
                    <TableRow key={`${order.id}-${item.id}`}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'HH:mm')}</TableCell>
                      <TableCell>
                        <div>
                          <div>{order.user.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.menu.title}</TableCell>
                      <TableCell>¥{item.menu.price * item.qty}</TableCell>
                      <TableCell>
                        {order.request_time || '時間指定なし'}
                      </TableCell>
                    </TableRow>
                  ))
                )) || (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                      注文がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
