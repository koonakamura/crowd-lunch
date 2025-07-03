import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { Menu } from '../lib/api'

const WEEKLY_MENU_DATA: Array<{
  date: string;
  dayName: string;
  backgroundImage: string;
  menus: Menu[];
}> = [
  {
    date: '7/7',
    dayName: 'Mon',
    backgroundImage: '/monday-bg.jpg',
    menus: [
      { id: 1, serve_date: '2024-07-07', title: 'マグロサーモン丼', price: 1000, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 2, serve_date: '2024-07-07', title: 'ネギトロ丼', price: 1000, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 3, serve_date: '2024-07-07', title: '特選ちらし丼', price: 1000, max_qty: 40, remaining_qty: 40, created_at: '' }
    ]
  },
  {
    date: '7/8',
    dayName: 'Tue',
    backgroundImage: '/tuesday-bg.jpg',
    menus: [
      { id: 4, serve_date: '2024-07-08', title: 'からあげ丼', price: 900, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 5, serve_date: '2024-07-08', title: '肉たっぷり麻婆豆腐丼', price: 900, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 6, serve_date: '2024-07-08', title: 'スタミナステーキ丼', price: 900, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 7, serve_date: '2024-07-08', title: '大盛り', price: 100, max_qty: 40, remaining_qty: 40, created_at: '' }
    ]
  },
  {
    date: '7/9',
    dayName: 'Wed',
    backgroundImage: '/wednesday-bg.jpg',
    menus: [
      { id: 8, serve_date: '2024-07-09', title: 'カレーライス', price: 800, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 9, serve_date: '2024-07-09', title: '大盛り', price: 100, max_qty: 40, remaining_qty: 40, created_at: '' },
      { id: 10, serve_date: '2024-07-09', title: '南蛮漬け', price: 100, max_qty: 40, remaining_qty: 40, created_at: '' }
    ]
  },
  {
    date: '7/10',
    dayName: 'Thu',
    backgroundImage: '/thursday-bg.jpg',
    menus: [
      { id: 11, serve_date: '2024-07-10', title: '鴨出汁カレーと焼き野菜', price: 900, max_qty: 40, remaining_qty: 40, created_at: '' }
    ]
  },
  {
    date: '7/11',
    dayName: 'Fri',
    backgroundImage: '/friday-bg.jpg',
    menus: [
      { id: 12, serve_date: '2024-07-11', title: 'ゲンキカレー', price: 1000, max_qty: 40, remaining_qty: 40, created_at: '' }
    ]
  }
];

export { WEEKLY_MENU_DATA };

export default function HomePage() {
  const navigate = useNavigate()
  const [selectedItems, setSelectedItems] = useState<Array<{ menuId: number; qty: number }>>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(2) // Start with Wednesday (index 2)

  const currentDay = WEEKLY_MENU_DATA[currentDayIndex]

  const handleAddToCart = (menuId: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.menuId === menuId)
      if (existing) {
        return prev.map(item => 
          item.menuId === menuId 
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      }
      return [...prev, { menuId, qty: 1 }]
    })
  }

  const getTotalItems = () => {
    return selectedItems.reduce((total, item) => total + item.qty, 0)
  }

  const handleProceedToOrder = () => {
    if (selectedItems.length > 0) {
      navigate('/order', { state: { selectedItems } })
    }
  }

  const goToPreviousDay = () => {
    setCurrentDayIndex(prev => prev > 0 ? prev - 1 : WEEKLY_MENU_DATA.length - 1)
  }

  const goToNextDay = () => {
    setCurrentDayIndex(prev => prev < WEEKLY_MENU_DATA.length - 1 ? prev + 1 : 0)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-border p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">CROWD LUNCH</h1>
        </div>
      </header>

      {/* Single Day Display */}
      <section 
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), url(${currentDay.backgroundImage})`
        }}
      >
        {/* Day Navigation */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Large Day Display */}
        <div className="text-center py-20">
          <h1 className="text-9xl font-bold text-white mb-2">{currentDay.date.split('/')[1]}</h1>
          <h2 className="text-2xl text-white">({currentDay.dayName.toUpperCase()})</h2>
        </div>
        
        {/* Menu Items - Pill Style */}
        <div className="px-6 space-y-3 max-w-md mx-auto pb-20">
          {currentDay.menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleAddToCart(menu.id)}
              disabled={!menu.remaining_qty || menu.remaining_qty <= 0}
              className="w-full bg-white/80 backdrop-blur-sm rounded-full px-6 py-4 flex justify-between items-center hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium text-gray-800">
                {menu.title} ({menu.remaining_qty})
              </span>
              <span className="font-bold text-gray-800">
                {menu.price}円
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Cart Button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button 
            onClick={handleProceedToOrder}
            className="bg-primary hover:bg-primary/90 rounded-full p-4 shadow-lg backdrop-blur-sm"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            注文へ ({getTotalItems()})
          </Button>
        </div>
      )}
    </div>
  )
}
