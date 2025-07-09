import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { ShoppingCart, User, Plus, Minus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState<Record<number, number>>({})
  const [showLanding, setShowLanding] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  const { data: weeklyMenus, isLoading } = useQuery({
    queryKey: ['weeklyMenus'],
    queryFn: () => apiClient.getWeeklyMenus(),
  })

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

  const getBackgroundClass = (dayIndex: number) => {
    const backgrounds = [
      'bg-sushi',
      'bg-fried', 
      'bg-curry',
      'bg-ramen',
      'bg-bento'
    ]
    return backgrounds[dayIndex] || 'bg-gray-500'
  }

  const getSampleMenusForDay = (dayIndex: number) => {
    const sampleMenus = [
      [
        { id: 1, title: 'マグロサーモン丼', price: 1000, remaining_qty: 40 },
        { id: 2, title: 'ネギトロ丼', price: 1000, remaining_qty: 40 },
        { id: 3, title: '特選ちらし丼', price: 1000, remaining_qty: 40 }
      ],
      [
        { id: 4, title: 'からあげ丼', price: 900, remaining_qty: 40 },
        { id: 5, title: '鶏とごぼうの混ぜご飯', price: 900, remaining_qty: 40 },
        { id: 6, title: 'スタミナ丼', price: 900, remaining_qty: 40 },
        { id: 7, title: '大盛り', price: 100, remaining_qty: 40 }
      ],
      [
        { id: 8, title: 'カレーライス', price: 800, remaining_qty: 40 },
        { id: 9, title: '大盛り', price: 100, remaining_qty: 40 },
        { id: 10, title: '唐揚げ弁当', price: 100, remaining_qty: 40 }
      ],
      [
        { id: 11, title: '醤油ラーメン+半野菜', price: 900, remaining_qty: 40 }
      ],
      [
        { id: 12, title: 'ブランチ', price: 1000, remaining_qty: 40 }
      ]
    ]
    return sampleMenus[dayIndex] || []
  }

  const addToCart = (menuId: number) => {
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
    const orderItems = Object.entries(cart).map(([menuId, qty]) => ({
      menu_id: parseInt(menuId),
      qty
    }))
    
    navigate('/order', { 
      state: { 
        orderItems,
        selectedDate: format(new Date(), 'yyyy-MM-dd')
      } 
    })
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
          <p className="text-gray-600 mt-4 text-lg">
            クリックまたはスクロールして開始
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white font-lato">CROWD LUNCH</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-white hover:bg-white/20">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {weekDays.map((day, index) => {
        const dayMenus = weeklyMenus?.find(
          w => w.date === format(day, 'yyyy-MM-dd')
        )?.menus || getSampleMenusForDay(index)
        
        return (
          <section 
            key={format(day, 'yyyy-MM-dd')}
            className={`min-h-screen relative flex flex-col justify-center items-center p-8 ${getBackgroundClass(index)}`}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            
            <div className="relative z-10 text-center mb-8">
              <h2 className="text-4xl font-bold text-white">
                {format(day, 'M/d')}
              </h2>
              <p className="text-lg text-white">
                ({format(day, 'E', { locale: ja }).toUpperCase()})
              </p>
            </div>
            
            <div className="relative z-10 space-y-4 w-full max-w-md">
              {dayMenus.map((menu) => (
                <div 
                  key={menu.id} 
                  className="bg-black bg-opacity-60 rounded-lg p-4 text-white"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-semibold">{menu.title} ({menu.remaining_qty || 40})</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">{menu.price}円</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cart[menu.id] > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(menu.id)}
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center text-white">{cart[menu.id]}</span>
                          </>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => addToCart(menu.id)}
                          disabled={(menu.remaining_qty || 0) <= 0}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {getTotalItems() > 0 && (
        <div className="fixed bottom-4 right-4 z-20">
          <Button 
            onClick={handleProceedToOrder}
            className="bg-primary hover:bg-primary/90 rounded-full p-4 shadow-lg"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            注文へ ({getTotalItems()})
          </Button>
        </div>
      )}
    </div>
  )
}
