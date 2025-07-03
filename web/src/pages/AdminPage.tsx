import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { ArrowLeft, Upload, Calendar, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AdminSplashScreen from '../components/AdminSplashScreen'

export default function AdminPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSplashTransition = () => {
    setShowSplash(false)
  }

  const mockOrders = [
    {
      id: 1,
      created_at: new Date().toISOString(),
      total_price: 1000,
      status: 'paid',
      request_time: '12:30',
      user: { name: '田中太郎' },
      order_items: [
        { menu: { title: 'カレーライス' }, qty: 1 },
        { menu: { title: '大盛り' }, qty: 1 }
      ]
    },
    {
      id: 2,
      created_at: new Date().toISOString(),
      total_price: 900,
      status: 'preparing',
      request_time: '店頭受取',
      user: { name: '佐藤花子' },
      order_items: [
        { menu: { title: 'カレーライス' }, qty: 1 }
      ]
    }
  ]

  const { data: orders, isLoading } = useQuery({
    queryKey: ['todayOrders'],
    queryFn: () => Promise.resolve(mockOrders),
    refetchInterval: 5000,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      apiClient.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayOrders'] })
    },
  })


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

  if (showSplash) {
    return <AdminSplashScreen onTransition={handleSplashTransition} />
  }

  const formatOrderItems = (orderItems: Array<{ menu: { title: string }; qty: number }>) => {
    return orderItems.map(item => `${item.menu.title} × ${item.qty}`).join('、')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <div className="text-lg">注文データを読み込み中...</div>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            <span className="text-black">CROWD LUNCH </span>
            <span className="text-gray-500 font-normal">Order sheet</span>
          </h1>
          <span className="text-sm text-muted-foreground">
            {format(new Date(), 'yyyy年M月d日')}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Date Selection Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              日付ごとの注文ページ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() + i)
                const dateStr = format(date, 'yyyy-MM-dd')
                const dayStr = format(date, 'M/d (E)')
                return (
                  <Button
                    key={dateStr}
                    variant={selectedDate === dateStr ? "default" : "outline"}
                    onClick={() => setSelectedDate(dateStr)}
                    className="rounded-full"
                  >
                    {dayStr}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Menu Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>メニュー構成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 items-start">
              {/* Left: Image Section */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-500">画像をアップロード</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  選択
                </Button>
              </div>

              {/* Center: Menu Items */}
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-2 border-b">
                    <Input defaultValue="カレーライス" className="flex-1" />
                    <Input defaultValue="900" type="number" className="w-20" />
                    <Input defaultValue="34" type="number" className="w-16" />
                    <Button variant="ghost" size="sm" className="p-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 py-2 border-b">
                    <Input defaultValue="大盛り" className="flex-1" />
                    <Input defaultValue="100" type="number" className="w-20" />
                    <Input defaultValue="5" type="number" className="w-16" />
                    <Button variant="ghost" size="sm" className="p-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 py-2 border-b">
                    <Input defaultValue="南蛮漬け" className="flex-1" />
                    <Input defaultValue="100" type="number" className="w-20" />
                    <Input defaultValue="8" type="number" className="w-16" />
                    <Button variant="ghost" size="sm" className="p-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Input placeholder="メニュー名を入力" className="flex-1" />
                  <Input placeholder="金額" type="number" className="w-20" />
                  <Input placeholder="数量" type="number" className="w-16" />
                  <Button size="sm">追加</Button>
                </div>
              </div>

              {/* Right: Quantity Display */}
              <div className="flex-shrink-0 text-right">
                <div className="border-l pl-4">
                  <p className="text-sm font-medium">数量：</p>
                  <p className="text-lg font-bold">34 / 40</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle>注文履歴</CardTitle>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                注文履歴がありません
              </p>
            ) : (
              <div className="space-y-3">
                {orders
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">注文ID:</span> #{order.id}
                      </div>
                      <div>
                        <span className="font-semibold">注文時間:</span> {format(new Date(order.created_at), 'HH:mm')}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold">注文品目:</span> {formatOrderItems(order.order_items)}
                      </div>
                      <div>
                        <span className="font-semibold">金額:</span> ¥{order.total_price}
                      </div>
                      <div>
                        <span className="font-semibold">名前:</span> {order.user.name}
                      </div>
                      <div>
                        <span className="font-semibold">配達時間:</span> {order.request_time || '店頭受取'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
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
