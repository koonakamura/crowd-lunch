import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { User, Plus, Minus } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function HomePage() {
  const { user, logout } = useAuth()
  const [cart, setCart] = useState<Record<number, number>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [department, setDepartment] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [showThankYou, setShowThankYou] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['weeklyMenus'],
    queryFn: () => apiClient.getWeeklyMenus(),
  })

  const weekDays = [
    new Date('2025-07-07'), // Monday 7/7
    new Date('2025-07-08'), // Tuesday 7/8
    new Date('2025-07-09'), // Wednesday 7/9
    new Date('2025-07-10'), // Thursday 7/10
    new Date('2025-07-11')  // Friday 7/11
  ]

  const getBackgroundImage = (dayIndex: number) => {
    const images = [
      '/images/monday.jpeg', // Placeholder for Monday
      '/images/tuesday.jpeg',
      '/images/wednesday.jpeg',
      '/images/thursday.jpeg',
      '/images/friday.jpeg'
    ]
    return images[dayIndex] || '/images/monday.jpeg'
  }

  const WEEKLY_MENU_DATA = {
    '7/7': [
      { id: 1, title: 'マグロサーモン丼', price: 1000, remaining_qty: 20 },
      { id: 2, title: 'ネギトロ丼', price: 1000, remaining_qty: 20 },
      { id: 3, title: '特選ちらし丼', price: 1000, remaining_qty: 20 }
    ],
    '7/8': [
      { id: 4, title: 'からあげ丼', price: 900, remaining_qty: 20 },
      { id: 5, title: '肉たっぷり麻婆豆腐丼', price: 900, remaining_qty: 20 },
      { id: 6, title: 'スタミナ丼', price: 900, remaining_qty: 20 },
      { id: 7, title: '大盛り', price: 100, remaining_qty: 20 }
    ],
    '7/9': [
      { id: 8, title: 'カレーライス', price: 800, remaining_qty: 40 },
      { id: 9, title: '大盛り', price: 100, remaining_qty: 40 },
      { id: 10, title: '南蛮漬け', price: 100, remaining_qty: 40 }
    ],
    '7/10': [
      { id: 11, title: 'ゲンキカレー', price: 1000, remaining_qty: 40 }
    ],
    '7/11': [
      { id: 12, title: '鴨出汁カレーと焼き野菜', price: 900, remaining_qty: 40 }
    ]
  }


  const addToCart = (menuId: number, dayKey: string) => {
    if (selectedDay && selectedDay !== dayKey) {
      setCart({})
    }
    setSelectedDay(dayKey)
    setCart(prev => ({
      ...prev,
      [menuId]: (prev[menuId] || 0) + 1
    }))
  }

  const removeFromCart = (menuId: number) => {
    setCart(prev => {
      const newCart = { ...prev }
      if (newCart[menuId] > 1) {
        newCart[menuId]--
      } else {
        delete newCart[menuId]
      }
      return newCart
    })
  }

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  }

  const handleProceedToOrder = () => {
    setShowOrderModal(true)
  }

  const getSelectedMenus = () => {
    const allMenus = Object.values(WEEKLY_MENU_DATA).flat()
    return Object.entries(cart).map(([menuId, qty]) => {
      const menu = allMenus.find(m => m.id === parseInt(menuId))
      return { menu, qty }
    }).filter(item => item.menu)
  }

  const getTotalPrice = () => {
    return getSelectedMenus().reduce((total, item) => total + (item.menu!.price * item.qty), 0)
  }

  const handleSubmitOrder = async () => {
    if (!department.trim() || !customerName.trim() || !deliveryTime) return
    
    setIsSubmitting(true)
    try {
      const orderItems = Object.entries(cart).map(([menuId, qty]) => ({
        menu_id: parseInt(menuId),
        qty
      }))

      await apiClient.createGuestOrder({
        serve_date: format(new Date(), 'yyyy-MM-dd'),
        delivery_type: 'desk',
        request_time: deliveryTime,
        customer_name: `${department} ${customerName}`,
        items: orderItems
      })

      setShowOrderModal(false)
      setShowThankYou(true)
      setCart({})
      setSelectedDay(null)
      setDepartment('')
      setCustomerName('')
      setDeliveryTime('')
    } catch (error) {
      console.error('Order submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLandingClick = () => {
    setFadeOut(true)
    setTimeout(() => {
      setShowLanding(false)
    }, 500)
  }

  useEffect(() => {
    const handleScroll = () => {
      if (showLanding && window.scrollY > 50) {
        handleLandingClick()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showLanding && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        handleLandingClick()
      }
    }

    if (showLanding) {
      window.addEventListener('scroll', handleScroll)
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showLanding])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (showLanding) {
    return (
      <div 
        className={`min-h-screen bg-gray-50 flex items-center justify-center cursor-pointer transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleLandingClick}
      >
        <div className="text-center">
          <h1 className="text-6xl font-bold text-black tracking-wider font-lato">
            CROWD LUNCH
          </h1>
        </div>
      </div>
    )
  }

  if (showThankYou) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">注文を承りました。</h2>
          <p className="text-gray-600 mb-2">ご指定の時間にお座席にお届けします。</p>
          <p className="text-gray-600 mb-2">支払いはタッチ決済になりますのでご用意をお願いします。</p>
          <p className="text-gray-600 mb-6">それでは時間まで楽しみにお待ちください。</p>
          <Button 
            onClick={() => setShowThankYou(false)}
            className="bg-primary hover:bg-primary/90"
          >
            戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black font-lato">CROWD LUNCH</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-black">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-black hover:bg-gray-100">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-16">
        {weekDays.map((day, index) => {
          const dayKey = ['7/7', '7/8', '7/9', '7/10', '7/11'][index]
          const dayMenus = WEEKLY_MENU_DATA[dayKey as keyof typeof WEEKLY_MENU_DATA] || []
          
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          
          return (
            <section 
              key={format(day, 'yyyy-MM-dd')}
              className="min-h-screen relative flex flex-col justify-center items-center p-8"
              style={{
                backgroundImage: `url(${getBackgroundImage(index)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              
              <div className="relative z-10 text-center mb-8">
                <h2 className="text-6xl font-bold text-white font-baskerville">
                  {dayKey}
                </h2>
                <p className="text-2xl text-white mt-2">
                  ({dayNames[index]})
                </p>
              </div>
              
              <div className="relative z-10 w-full max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {dayMenus.map((menu) => (
                    <button
                      key={menu.id}
                      onClick={() => addToCart(menu.id, dayKey)}
                      disabled={(menu.remaining_qty || 0) <= 0}
                      className={`p-4 rounded-lg text-white font-semibold transition-colors ${
                        cart[menu.id] > 0 
                          ? 'bg-primary border-2 border-primary' 
                          : 'bg-black bg-opacity-60 border-2 border-transparent hover:bg-primary hover:bg-opacity-80'
                      }`}
                    >
                      <div className="text-center">
                        <h3 className="text-lg mb-2">{menu.title}</h3>
                        <p className="text-sm mb-1">({menu.remaining_qty})</p>
                        <p className="text-xl font-bold">{menu.price}円</p>
                        {cart[menu.id] > 0 && (
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFromCart(menu.id)
                              }}
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center text-white">{cart[menu.id]}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(menu.id, dayKey)
                              }}
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                {getTotalItems() > 0 && selectedDay === dayKey && (
                  <div className="text-center">
                    <Button 
                      onClick={handleProceedToOrder}
                      className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg rounded-full"
                    >
                      注文
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">注文確認</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">注文内容</h3>
              {getSelectedMenus().map(({ menu, qty }) => (
                <div key={menu!.id} className="flex justify-between">
                  <span>{menu!.title} × {qty}</span>
                  <span>{menu!.price * qty}円</span>
                </div>
              ))}
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between font-bold">
                  <span>合計</span>
                  <span>{getTotalPrice()}円</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">部署</label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="部署名を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">お名前</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="お名前を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">希望お届け時間</label>
                <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="12:00～12:15">12:00～12:15</SelectItem>
                    <SelectItem value="12:15～12:30">12:15～12:30</SelectItem>
                    <SelectItem value="12:30～12:45">12:30～12:45</SelectItem>
                    <SelectItem value="12:45～13:00">12:45～13:00</SelectItem>
                    <SelectItem value="13:00～13:15">13:00～13:15</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || !department.trim() || !customerName.trim() || !deliveryTime}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? '注文中...' : '注文確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
