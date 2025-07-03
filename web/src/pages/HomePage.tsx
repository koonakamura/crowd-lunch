import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
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
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})

  const handleMenuSelect = (menuId: number, dayDate: string) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev }
      
      if (newSelected[dayDate] === menuId) {
        delete newSelected[dayDate]
      } else {
        newSelected[dayDate] = menuId
      }
      
      return newSelected
    })
  }

  const isMenuSelected = (menuId: number, dayDate: string) => {
    return selectedItems[dayDate] === menuId
  }

  const getSelectedMenuForDay = (dayDate: string) => {
    return selectedItems[dayDate]
  }

  const handleProceedToOrder = (dayDate: string) => {
    const selectedMenuId = selectedItems[dayDate]
    if (selectedMenuId) {
      navigate('/order', { 
        state: { 
          selectedItems: [{ menuId: selectedMenuId, qty: 1 }] 
        } 
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-border p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">CROWD LUNCH</h1>
        </div>
      </header>

      {/* Weekly Menu - Vertical Scrolling */}
      <div className="space-y-0">
        {WEEKLY_MENU_DATA.map((day) => (
          <section 
            key={day.date}
            className="relative min-h-screen bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${day.backgroundImage})`
            }}
          >
            {/* Day Header */}
            <div className="text-center py-20">
              <h1 className="text-6xl font-bold text-white mb-2">{day.date}</h1>
              <h2 className="text-2xl text-white">({day.dayName.toUpperCase()})</h2>
            </div>
            
            {/* Menu Items - Pill Style */}
            <div className="px-6 space-y-3 max-w-md mx-auto pb-8">
              {day.menus.map((menu) => {
                const isSelected = isMenuSelected(menu.id, day.date)
                return (
                  <button
                    key={menu.id}
                    onClick={() => handleMenuSelect(menu.id, day.date)}
                    disabled={!menu.remaining_qty || menu.remaining_qty <= 0}
                    className={`w-full backdrop-blur-sm rounded-full px-6 py-4 flex justify-between items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-black/60 hover:bg-black/70'
                    }`}
                  >
                    <span className="font-medium text-white">
                      {menu.title} ({menu.remaining_qty})
                    </span>
                    <span className="font-bold text-white">
                      {menu.price}円
                    </span>
                  </button>
                )
              })}
              
              {/* Order Button for this day */}
              {getSelectedMenuForDay(day.date) && (
                <div className="pt-4">
                  <Button
                    onClick={() => handleProceedToOrder(day.date)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-3 font-bold"
                  >
                    注文する
                  </Button>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

    </div>
  )
}
