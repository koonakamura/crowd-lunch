import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../lib/auth'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['todayOrders'],
    queryFn: () => apiClient.getTodayOrders(),
    refetchInterval: 5000,
    enabled: user?.email === 'admin@example.com',
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      apiClient.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayOrders'] })
    },
  })

  if (user?.email !== 'admin@example.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">管理者権限が必要です</p>
          <Button onClick={() => navigate('/')}>ホームに戻る</Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-500'
      case 'paid':
        return 'bg-blue-500'
      case 'preparing':
        return 'bg-orange-500'
      case 'ready':
        return 'bg-green-500'
      case 'delivered':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return '支払い待ち'
      case 'paid':
        return '支払い完了'
      case 'preparing':
        return '調理中'
      case 'ready':
        return '受け取り可能'
      case 'delivered':
        return '配達完了'
      default:
        return '不明'
    }
  }

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">注文データを読み込み中...</div>
      </div>
    )
  }

  const menuSummary = orders?.reduce((acc, order) => {
    order.order_items.forEach(item => {
      const key = item.menu.title
      if (!acc[key]) {
        acc[key] = {
          title: item.menu.title,
          price: item.menu.price,
          totalQty: 0,
          orders: []
        }
      }
      acc[key].totalQty += item.qty
      acc[key].orders.push({
        orderId: order.id,
        qty: item.qty,
        status: order.status,
        deliveryType: order.delivery_type,
        requestTime: order.request_time || null,
        userName: order.user.name
      })
    })
    return acc
  }, {} as Record<string, {
    title: string;
    price: number;
    totalQty: number;
    orders: Array<{
      orderId: number;
      qty: number;
      status: string;
      deliveryType: string;
      requestTime: string | null;
      userName: string;
    }>;
  }>) || {}

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">管理画面</h1>
          <span className="text-sm text-muted-foreground">
            {format(new Date(), 'yyyy年M月d日')}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Menu Summary */}
        <Card>
          <CardHeader>
            <CardTitle>本日のメニュー別集計</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.values(menuSummary).length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                本日の注文はありません
              </p>
            ) : (
              <div className="space-y-4">
                {Object.values(menuSummary).map((menu) => (
                  <div key={menu.title} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{menu.title}</h3>
                      <Badge variant="outline">合計 {menu.totalQty}個</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      単価: ¥{menu.price} | 売上: ¥{menu.price * menu.totalQty}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Management */}
        <Card>
          <CardHeader>
            <CardTitle>注文管理</CardTitle>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                本日の注文はありません
              </p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">注文 #{order.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.user.name} | {order.delivery_type === 'pickup' ? '店頭受取' : 'デスク配達'}
                          {order.request_time && ` (${order.request_time})`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        <p className="text-sm font-semibold mt-1">¥{order.total_price}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.menu.title} × {item.qty}</span>
                          <span>¥{item.menu.price * item.qty}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">支払い待ち</SelectItem>
                          <SelectItem value="paid">支払い完了</SelectItem>
                          <SelectItem value="preparing">調理中</SelectItem>
                          <SelectItem value="ready">受け取り可能</SelectItem>
                          <SelectItem value="delivered">配達完了</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
