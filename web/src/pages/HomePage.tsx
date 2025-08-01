import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { generateWeekdayDates } from '../lib/dateUtils'

export default function HomePage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [cart, setCart] = useState<Record<number, number>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [department, setDepartment] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: weeklyMenus, isLoading } = useQuery({
    queryKey: ['weeklyMenus'],
    queryFn: () => apiClient.getWeeklyMenus(),
    refetchInterval: 30000,
  })

  const weekDays = generateWeekdayDates(new Date(), 7)

  const getBackgroundImage = (dayIndex: number, dayMenus: { img_url?: string }[]) => {
    const adminImage = dayMenus?.[0]?.img_url
    if (adminImage && adminImage.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'https://crowd-lunch.fly.dev'}${adminImage}`
    }
    
    const defaultImages = [
      '/images/monday.jpeg',
      '/images/tuesday.jpeg', 
      '/images/wednesday.jpeg',
      '/images/thursday.jpeg',
      '/images/friday.jpeg'
    ]
    return defaultImages[dayIndex] || '/images/monday.jpeg'
  }

  const getMenusForDate = (date: Date) => {
    if (!weeklyMenus || weeklyMenus.length === 0) return []
    
    const menusByDate = new Map(weeklyMenus.map(g => [g.date, g.menus]))
    const dateKey = format(date, 'yyyy-MM-dd')
    const menus = menusByDate.get(dateKey) ?? []
    return menus
  }


  const addToCart = (menuId: number, dayKey: string) => {
    if (selectedDay && selectedDay !== dayKey) {
      setCart({})
    }
    setSelectedDay(dayKey)
    setCart(prev => ({
      ...prev,
      [menuId]: prev[menuId] > 0 ? 0 : 1
    }))
  }


  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  }

  const handleProceedToOrder = () => {
    setShowOrderModal(true)
  }

  const getSelectedMenus = () => {
    if (!weeklyMenus) return []
    const allMenus = weeklyMenus.flatMap(day => day.menus || [])
    return Object.entries(cart).map(([menuId, qty]) => {
      const menu = allMenus.find(m => m.id === parseInt(menuId))
      return { menu, qty }
    }).filter(item => item.menu)
  }

  const getTotalPrice = () => {
    return getSelectedMenus().reduce((total, item) => total + (item.menu!.price * item.qty), 0)
  }

  const handleSubmitOrder = async () => {
    if (!department.trim() || !customerName.trim() || !deliveryTime || !deliveryLocation) return
    
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
        delivery_location: deliveryLocation,
        department: department,
        name: customerName,
        items: orderItems
      })

      queryClient.invalidateQueries({ queryKey: ['orders', format(new Date(), 'yyyy-MM-dd')] })
      queryClient.invalidateQueries({ queryKey: ['weeklyMenus'] })

      setShowOrderModal(false)
      setShowThankYouModal(true)
      setCart({})
      setSelectedDay(null)
      setDepartment('')
      setCustomerName('')
      setDeliveryTime('')
      setDeliveryLocation('')
      setShowConfirmationModal(false)
      toast.success('注文が正常に送信されました')
    } catch (error) {
      console.error('Order submission failed:', error)
      toast.error('注文の送信に失敗しました。もう一度お試しください。')
      queryClient.invalidateQueries({ queryKey: ['orders', format(new Date(), 'yyyy-MM-dd')] })
      queryClient.invalidateQueries({ queryKey: ['weeklyMenus'] })
    }finally {
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
        {weekDays.map((dayInfo, index) => {
          const dayKey = format(dayInfo.date, 'M/d')
          const dayMenus = getMenusForDate(dayInfo.date)
          
          return (
            <section 
              key={format(dayInfo.date, 'yyyy-MM-dd')}
              className="min-h-screen relative flex flex-col justify-center items-center p-8"
              style={{
                backgroundImage: `url(${getBackgroundImage(index, dayMenus)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              
              <div className="relative z-10 text-center mb-8">
                <h2 className="text-8xl font-bold text-white font-crimson">
                  {dayKey}
                </h2>
                <p className="text-2xl text-white mt-2">
                  ({dayInfo.dayName})
                </p>
              </div>
              
              <div className="relative z-10 w-full max-w-xl">
                <div className="flex flex-col gap-2 mb-8">
                  {dayMenus.map((menu) => (
                    <button
                      key={menu.id}
                      onClick={() => addToCart(menu.id, dayKey)}
                      disabled={(menu.remaining_qty || 0) <= 0}
                      className={`p-4 rounded-3xl text-white font-semibold transition-colors w-full ${
                        cart[menu.id] > 0 
                          ? 'bg-primary border-2 border-primary' 
                          : 'bg-black bg-opacity-60 border-2 border-transparent hover:bg-primary hover:bg-opacity-80'
                      }`}
                      data-testid="menu-item"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{menu.title}</span>
                          <span className="text-sm">({menu.remaining_qty})</span>
                        </div>
                        <span className="text-lg font-bold">{menu.price}円</span>
                      </div>
                    </button>
                  ))}
                </div>
                
                {getTotalItems() > 0 && selectedDay === dayKey && (
                  <div className="text-center">
                    <Button 
                      onClick={handleProceedToOrder}
                      className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg rounded-3xl"
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
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">注文確認</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">注文内容</h3>
              {getSelectedMenus().map(({ menu }) => (
                <div key={menu!.id} className="flex justify-between">
                  <span>{menu!.title}</span>
                  <span>{menu!.price}円</span>
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
                  className="bg-white border-gray-300 text-black"
                  placeholder="部署名を入力"
                  data-testid="department"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">お名前</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-white border-gray-300 text-black"
                  placeholder="お名前を入力"
                  data-testid="customer-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">希望お届け時間</label>
                <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                  <SelectTrigger className="bg-white border-gray-300 text-black" data-testid="delivery-time">
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="11:30～11:45">11:30～11:45</SelectItem>
                    <SelectItem value="11:45～12:00">11:45～12:00</SelectItem>
                    <SelectItem value="12:00～12:15">12:00～12:15</SelectItem>
                    <SelectItem value="12:15～12:30">12:15～12:30</SelectItem>
                    <SelectItem value="12:30～12:45">12:30～12:45</SelectItem>
                    <SelectItem value="12:45～13:00">12:45～13:00</SelectItem>
                    <SelectItem value="13:00～13:15">13:00～13:15</SelectItem>
                    <SelectItem value="13:15～13:30">13:15～13:30</SelectItem>
                    <SelectItem value="13:30～13:45">13:30～13:45</SelectItem>
                    <SelectItem value="13:45～14:00">13:45～14:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-white">お届け場所</label>
                <div className="flex gap-4">
                  <label className="flex items-center text-white">
                    <input
                      type="radio"
                      value="5F"
                      checked={deliveryLocation === '5F'}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="mr-2"
                    />
                    5F
                  </label>
                  <label className="flex items-center text-white">
                    <input
                      type="radio"
                      value="10F"
                      checked={deliveryLocation === '10F'}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="mr-2"
                    />
                    10F
                  </label>
                </div>
              </div>

              <div className="text-sm text-gray-300 mt-2 p-3 bg-gray-800 rounded">
                <p>ピークタイム直前のご注文はお届け時間が多少前後する可能性がございます。</p>
                <p>当日11時までの予約注文は、時間通りのお届けがしやすくなりますので事前のご予約をお願いします。</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowConfirmationModal(true)}
              disabled={isSubmitting || !department.trim() || !customerName.trim() || !deliveryTime || !deliveryLocation}
              className="w-full bg-primary hover:bg-primary/90 text-white"
              data-testid="submit-order"
            >
              {isSubmitting ? '注文中...' : '注文確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showThankYouModal} onOpenChange={setShowThankYouModal}>
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl text-center">注文を承りました。</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center">
            <p className="text-white">注文を承りました。</p>
            <p className="text-white">ご指定の時間にお座席にお届けします。</p>
            <p className="text-white">支払いはタッチ決済のご用意をお願いします。</p>
            <p className="text-white">それでは時間まで楽しみにお待ちください。</p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowThankYouModal(false)}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              戻る
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="bg-black border-primary border-2 text-white max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">ご注文内容の確認</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">注文内容</h3>
              <div className="space-y-1">
                {getSelectedMenus().map(({ menu, qty }) => (
                  <div key={menu!.id} className="flex justify-between text-sm">
                    <span>{menu!.title} × {qty}</span>
                    <span>¥{(menu!.price * qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-600 pt-2">
              <div className="flex justify-between font-semibold">
                <span>合計金額</span>
                <span>¥{getTotalPrice().toLocaleString()}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">お届け先情報</h3>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-300">部署:</span> {department}</div>
                <div><span className="text-gray-300">お名前:</span> {customerName}</div>
                <div><span className="text-gray-300">お届け場所:</span> {deliveryLocation}</div>
                <div><span className="text-gray-300">希望お届け時間:</span> {deliveryTime}</div>
              </div>
            </div>
            
            <p className="text-center text-gray-300">ご注文を確定します</p>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              onClick={() => setShowConfirmationModal(false)}
              className="flex-1 bg-gray-600 text-white hover:bg-gray-700"
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmitOrder} 
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? '注文中...' : '注文確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
