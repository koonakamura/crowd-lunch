import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useAuth } from '../lib/auth'
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react'
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

  const weekdayDates = generateWeekdayDates(new Date(), 10)


  const { data: orders } = useQuery({
    queryKey: ['orders', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getOrdersByDate(formatDateForApi(selectedDate)),
    enabled: user?.email === 'admin@example.com',
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadImage(file),
    onSuccess: (data) => {
      setMenuImage(data.file_url)
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
              onClick={() => setSelectedDate(dateInfo.date)}
            >
              {dateInfo.formatted}({dateInfo.dayName})
            </Button>
          ))}
        </div>

        {/* Menu Management */}
        <Card>
          <CardHeader>
            <CardTitle>メニュー構成</CardTitle>
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
                  <div className="w-20 text-center">数量</div>
                  <div className="w-8"></div>
                  <div className="w-8"></div>
                </div>
                
                {menuItems.map((item, index) => (
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
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMenuItem}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  メニュー追加
                </Button>
              </div>
            </div>

            <Button onClick={saveMenu} className="w-full bg-black text-white hover:bg-gray-800">
              保存
            </Button>
          </CardContent>
        </Card>

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
