import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toServeDateKey } from '../lib/dateUtils'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { ArrowLeft, Plus, Minus } from 'lucide-react'

interface SelectedItem {
  menuId: number
  qty: number
}

export default function OrderPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedItems = (location.state?.selectedItems as SelectedItem[]) || []
  
  const [orderItems, setOrderItems] = useState(selectedItems)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'desk'>('pickup')
  const [requestTime, setRequestTime] = useState('12:30')
  const [customerName, setCustomerName] = useState('')
  const [department, setDepartment] = useState('')

  const { data: weeklyMenus } = useQuery({
    queryKey: ['weeklyMenus'],
    queryFn: () => apiClient.getWeeklyMenus(),
  })

  const createOrderMutation = useMutation({
    mutationFn: (orderData: {
      serve_date: string;
      delivery_type: "pickup" | "desk";
      request_time?: string;
      department: string;
      name: string;
      items: Array<{ menu_id: number; qty: number }>;
    }) => apiClient.createGuestOrder(orderData),
    onSuccess: (order) => {
      navigate(`/order/confirm/${order.id}`)
    },
  })

  useEffect(() => {
    if (selectedItems.length === 0) {
      navigate('/')
    }
  }, [selectedItems, navigate])

  const getMenuById = (menuId: number) => {
    if (!weeklyMenus) return null
    for (const day of weeklyMenus) {
      const menu = day.menus.find(m => m.id === menuId)
      if (menu) return menu
    }
    return null
  }

  const updateQuantity = (menuId: number, change: number) => {
    setOrderItems(prev => 
      prev.map(item => 
        item.menuId === menuId 
          ? { ...item, qty: Math.max(0, item.qty + change) }
          : item
      ).filter(item => item.qty > 0)
    )
  }

  const getTotalPrice = () => {
    return orderItems.reduce((total, item) => {
      const menu = getMenuById(item.menuId)
      return total + (menu?.price || 0) * item.qty
    }, 0)
  }

  const handleSubmitOrder = () => {
    if (!customerName.trim() || !department.trim()) {
      alert('部署名とお名前を入力してください')
      return
    }

    const orderData = {
      serve_date: toServeDateKey(new Date()),
      delivery_type: deliveryType as "pickup" | "desk",
      request_time: deliveryType === 'desk' ? requestTime : undefined,
      department: department.trim(),
      name: customerName.trim(),
      items: orderItems.map(item => ({
        menu_id: item.menuId,
        qty: item.qty
      }))
    }

    createOrderMutation.mutate(orderData)
  }

  if (orderItems.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">注文内容確認</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>注文商品</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderItems.map((item) => {
              const menu = getMenuById(item.menuId)
              if (!menu) return null

              return (
                <div key={item.menuId} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{menu.title}</h3>
                    <p className="text-sm text-muted-foreground">¥{menu.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.menuId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.qty}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.menuId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-semibold">
                    ¥{menu.price * item.qty}
                  </div>
                </div>
              )
            })}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>合計</span>
                <span>¥{getTotalPrice()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Options */}
        <Card>
          <CardHeader>
            <CardTitle>受け取り方法</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={deliveryType} onValueChange={(value: 'pickup' | 'desk') => setDeliveryType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup">店頭受け取り</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="desk" id="desk" />
                <Label htmlFor="desk">デスク配達</Label>
              </div>
            </RadioGroup>

            {deliveryType === 'desk' && (
              <div className="mt-4">
                <Label htmlFor="time">配達希望時間</Label>
                <Input
                  id="time"
                  type="time"
                  value={requestTime}
                  onChange={(e) => setRequestTime(e.target.value)}
                  min="12:30"
                  max="14:00"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  12:30〜14:00の間で指定してください
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Name */}
        <Card>
          <CardHeader>
            <CardTitle>注文者情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="department">部署名</Label>
              <Input
                id="department"
                type="text"
                placeholder="部署名を入力してください"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="customerName">お名前</Label>
              <Input
                id="customerName"
                type="text"
                placeholder="お名前を入力してください"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmitOrder}
          disabled={createOrderMutation.isPending || orderItems.length === 0 || !customerName.trim() || !department.trim()}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {createOrderMutation.isPending ? '注文中...' : '注文を確定する'}
        </Button>
      </div>
    </div>
  )
}
