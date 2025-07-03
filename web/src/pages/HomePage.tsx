import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
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
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [department, setDepartment] = useState('')
  const [name, setName] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')

  const getMenuDay = (menuId: number) => {
    for (const day of WEEKLY_MENU_DATA) {
      const menu = day.menus.find(m => m.id === menuId)
      if (menu) return day.date
    }
    return null
  }

  const handleMenuSelect = (menuId: number) => {
    const menuDay = getMenuDay(menuId)
    if (!menuDay) return

    setSelectedItems(prev => {
      if (!selectedDay || selectedDay === menuDay) {
        const newSelection = {
          ...prev,
          [menuId]: !prev[menuId]
        }
        
        const hasSelections = Object.values(newSelection).some(selected => selected)
        setSelectedDay(hasSelections ? menuDay : null)
        
        return newSelection
      } else {
        setSelectedDay(menuDay)
        return { [menuId]: true }
      }
    })
  }

  const isMenuSelected = (menuId: number) => {
    return selectedItems[menuId] || false
  }

  const getSelectedMenus = () => {
    return Object.keys(selectedItems)
      .filter(menuId => selectedItems[parseInt(menuId)])
      .map(menuId => parseInt(menuId))
  }

  const getMenuById = (menuId: number) => {
    for (const day of WEEKLY_MENU_DATA) {
      const menu = day.menus.find(m => m.id === menuId)
      if (menu) return menu
    }
    return null
  }

  const getTotalPrice = () => {
    return getSelectedMenus().reduce((total, menuId) => {
      const menu = getMenuById(menuId)
      return total + (menu?.price || 0)
    }, 0)
  }

  const hasSelectedItems = () => {
    return getSelectedMenus().length > 0
  }

  const handleOpenModal = () => {
    if (hasSelectedItems()) {
      setIsModalOpen(true)
    }
  }

  const handleConfirmOrder = () => {
    console.log('Order confirmed:', {
      items: getSelectedMenus(),
      department,
      name,
      deliveryTime,
      total: getTotalPrice()
    })
    setIsModalOpen(false)
    setSelectedItems({})
    setDepartment('')
    setName('')
    setDeliveryTime('')
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
              <h1 className="text-6xl font-bold text-white mb-2 font-droid-serif">{day.date}</h1>
              <h2 className="text-2xl text-white font-droid-serif">({day.dayName.toUpperCase()})</h2>
            </div>
            
            {/* Menu Items - Pill Style */}
            <div className="px-6 space-y-3 max-w-md mx-auto pb-8">
              {day.menus.map((menu) => {
                const isSelected = isMenuSelected(menu.id)
                return (
                  <button
                    key={menu.id}
                    onClick={() => handleMenuSelect(menu.id)}
                    disabled={!menu.remaining_qty || menu.remaining_qty <= 0}
                    className={`w-full backdrop-blur-sm rounded-full px-6 py-4 flex justify-between items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-black/60 hover:bg-black/70'
                    }`}
                  >
                    <span className="font-medium text-white font-hiragino">
                      {menu.title} ({menu.remaining_qty})
                    </span>
                    <span className="font-bold text-white font-hiragino">
                      {menu.price}円
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Global Order Button */}
      {hasSelectedItems() && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            onClick={handleOpenModal}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-3 font-bold shadow-lg"
          >
            注文する ({getSelectedMenus().length}品)
          </Button>
        </div>
      )}

      {/* Order Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ご注文内容</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selected Items */}
            <div className="space-y-2">
              {getSelectedMenus().map((menuId) => {
                const menu = getMenuById(menuId)
                if (!menu) return null
                return (
                  <div key={menuId} className="flex justify-between">
                    <span>{menu.title}</span>
                    <span>{menu.price}円</span>
                  </div>
                )
              })}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>合計</span>
                <span>{getTotalPrice()}円</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="department">部署</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="部署名を入力"
                />
              </div>

              <div>
                <Label htmlFor="name">お名前</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="お名前を入力"
                />
              </div>

              <div>
                <Label htmlFor="deliveryTime">希望お届け時間</Label>
                <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12:00-12:15">12:00～12:15</SelectItem>
                    <SelectItem value="12:15-12:30">12:15～12:30</SelectItem>
                    <SelectItem value="12:30-12:45">12:30～12:45</SelectItem>
                    <SelectItem value="12:45-13:00">12:45～13:00</SelectItem>
                    <SelectItem value="13:00-13:15">13:00～13:15</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleConfirmOrder}
              disabled={!department || !name || !deliveryTime}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              注文確定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
