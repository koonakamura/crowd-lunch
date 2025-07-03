import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { apiClient } from '../lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const [selectedItems, setSelectedItems] = useState<Array<{ menuId: number; qty: number }>>([])

  const { data: weeklyMenus, isLoading } = useQuery({
    queryKey: ['weeklyMenus'],
    queryFn: () => apiClient.getWeeklyMenus(),
  })

  const getWeekDays = () => {
    const today = new Date()
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  }

  const weekDays = getWeekDays()

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">メニューを読み込み中...</div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(/curry-rice-bg.jpg)'
      }}
    >
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Crowd Lunch</h1>
        </div>
      </header>

      {/* Weekly Tabs */}
      <div className="p-4">
        <Tabs defaultValue={format(weekDays[0], 'yyyy-MM-dd')} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/90 backdrop-blur-sm">
            {weekDays.map((day) => (
              <TabsTrigger 
                key={format(day, 'yyyy-MM-dd')} 
                value={format(day, 'yyyy-MM-dd')}
                className="text-xs"
              >
                {format(day, 'M/d', { locale: ja })}
                <br />
                {format(day, 'E', { locale: ja })}
              </TabsTrigger>
            ))}
          </TabsList>

          {weekDays.map((day) => {
            const dayMenus = weeklyMenus?.find(
              w => w.date === format(day, 'yyyy-MM-dd')
            )?.menus || []

            return (
              <TabsContent key={format(day, 'yyyy-MM-dd')} value={format(day, 'yyyy-MM-dd')}>
                <div className="space-y-4">
                  {dayMenus.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      この日のメニューはありません
                    </div>
                  ) : (
                    dayMenus.map((menu) => (
                      <Card key={menu.id} className="overflow-hidden bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                              {menu.img_url ? (
                                <img 
                                  src={menu.img_url} 
                                  alt={menu.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-xs text-muted-foreground">画像</div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{menu.title}</h3>
                              <p className="text-lg font-bold text-primary">¥{menu.price}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={menu.remaining_qty && menu.remaining_qty > 0 ? "default" : "destructive"}
                                  className={menu.remaining_qty && menu.remaining_qty > 0 ? "bg-green-500" : "bg-primary"}
                                >
                                  残り{menu.remaining_qty || 0}個
                                </Badge>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAddToCart(menu.id)}
                              disabled={!menu.remaining_qty || menu.remaining_qty <= 0}
                              size="sm"
                            >
                              追加
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>

      {/* Cart Button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-4 right-4">
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
