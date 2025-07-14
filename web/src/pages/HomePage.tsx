import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { generateWeekdayDates, formatDateForApi } from '../lib/dateUtils'

interface MenuItem {
  id: number
  menu_id: number
  name: string
  price: number
  stock: number
}

interface CartItem {
  menuItemId: number
  menuItemName: string
  price: number
  qty: number
}

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  totalPrice: number
  onSubmitOrder: (orderData: {
    department: string
    customerName: string
    deliveryTime: string
  }) => void
}

function OrderModal({ isOpen, onClose, cartItems, totalPrice, onSubmitOrder }: OrderModalProps) {
  const [department, setDepartment] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (department && customerName && deliveryTime) {
      onSubmitOrder({
        department,
        customerName,
        deliveryTime
      })
      setDepartment('')
      setCustomerName('')
      setDeliveryTime('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">注文確認</h2>
        
        <div className="mb-4">
          <h3 className="font-semibold mb-2">注文内容</h3>
          <div className="space-y-2">
            {cartItems.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.menuItemName} × {item.qty}</span>
                <span>¥{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-bold">
              <span>合計</span>
              <span>¥{totalPrice}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">部署</label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="部署名を入力"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">お客様名</label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="お名前を入力"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">お渡し時間</label>
            <Select value={deliveryTime} onValueChange={setDeliveryTime} required>
              <SelectTrigger>
                <SelectValue placeholder="時間を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="11:30">11:30</SelectItem>
                <SelectItem value="12:00">12:00</SelectItem>
                <SelectItem value="12:30">12:30</SelectItem>
                <SelectItem value="13:00">13:00</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button type="submit" className="flex-1">
              注文する
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [cart, setCart] = useState<CartItem[]>([])
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [showLandingPage, setShowLandingPage] = useState(true)

  const weekdayDates = generateWeekdayDates(new Date(), 5)

  const { data: menus } = useQuery({
    queryKey: ['menus', formatDateForApi(selectedDate)],
    queryFn: () => apiClient.getWeeklyMenus(),
  })

  const createOrderMutation = useMutation({
    mutationFn: (orderData: {
      serve_date: string
      delivery_type: "pickup" | "desk"
      request_time?: string
      items: { menu_id: number; menu_item_id: number; qty: number; menu_item_name: string }[]
    }) => apiClient.createOrder(orderData),
    onSuccess: () => {
      setCart([])
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      alert('注文が完了しました！')
    },
    onError: (error) => {
      console.error('Order creation failed:', error)
      alert('注文に失敗しました。もう一度お試しください。')
    }
  })

  const addToCart = (menuItem: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.menuItemId === menuItem.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.menuItemId === menuItem.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      } else {
        return [...prevCart, {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          price: menuItem.price,
          qty: 1
        }]
      }
    })
  }

  const removeFromCart = (menuItemId: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.menuItemId === menuItemId)
      if (existingItem && existingItem.qty > 1) {
        return prevCart.map(item =>
          item.menuItemId === menuItemId
            ? { ...item, qty: item.qty - 1 }
            : item
        )
      } else {
        return prevCart.filter(item => item.menuItemId !== menuItemId)
      }
    })
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0)
  }

  const getCartItemCount = (menuItemId: number) => {
    const item = cart.find(item => item.menuItemId === menuItemId)
    return item ? item.qty : 0
  }

  const handleOrderSubmit = (orderData: {
    department: string
    customerName: string
    deliveryTime: string
  }) => {
    const orderPayload = {
      serve_date: formatDateForApi(selectedDate),
      delivery_type: "desk" as const,
      request_time: orderData.deliveryTime,
      items: cart.map(item => ({
        menu_id: 1,
        menu_item_id: item.menuItemId,
        qty: item.qty,
        menu_item_name: item.menuItemName
      }))
    }

    createOrderMutation.mutate(orderPayload)
  }

  if (showLandingPage) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center text-white relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-8 font-crimson">CROWD LUNCH</h1>
          <p className="text-8xl font-bold text-white font-crimson mb-8">
            {format(new Date(), 'M/d')}
          </p>
          <Button 
            onClick={() => setShowLandingPage(false)}
            className="bg-white text-black hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
          >
            今日のメニューを見る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">CROWD LUNCH</h1>
            <div className="flex items-center gap-4">
              {cart.length > 0 && (
                <Button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="relative"
                >
                  カート ({cart.reduce((sum, item) => sum + item.qty, 0)})
                  <span className="ml-2">¥{getTotalPrice()}</span>
                </Button>
              )}
              <Button 
                onClick={() => setShowLandingPage(true)}
                variant="outline"
              >
                トップに戻る
              </Button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus && Array.isArray(menus) && menus.length > 0 ? (
            menus.map((menu: any) => (
              <Card key={menu.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  {menu.photo_url ? (
                    <img
                      src={menu.photo_url.startsWith('/static/uploads/') 
                        ? `${import.meta.env.VITE_API_URL || 'https://app-toquofbw.fly.dev'}${menu.photo_url}`
                        : menu.photo_url
                      }
                      alt={menu.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">画像なし</span>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{menu.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {menu.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">¥{item.price}</p>
                          <p className="text-xs text-gray-500">在庫: {item.stock}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getCartItemCount(item.id) > 0 && (
                            <Button
                              onClick={() => removeFromCart(item.id)}
                              variant="outline"
                              size="sm"
                            >
                              -
                            </Button>
                          )}
                          {getCartItemCount(item.id) > 0 && (
                            <span className="w-8 text-center">{getCartItemCount(item.id)}</span>
                          )}
                          <Button
                            onClick={() => addToCart(item)}
                            size="sm"
                            disabled={item.stock <= 0}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">メニューがありません</p>
            </div>
          )}
        </div>
      </div>

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        cartItems={cart}
        totalPrice={getTotalPrice()}
        onSubmitOrder={handleOrderSubmit}
      />
    </div>
  )
}
