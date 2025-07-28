import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { apiClient } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ArrowLeft, CheckCircle, Clock, Truck, Package } from 'lucide-react'
import { formatJSTTime } from '../lib/dateUtils'

export default function ConfirmPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.getOrder(Number(orderId)),
    enabled: !!orderId,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  })

  useEffect(() => {
    if (order) {
      const qrData = JSON.stringify({
        orderId: order.id,
        userId: order.user_id,
        totalPrice: order.total_price
      })
      
      QRCode.toDataURL(qrData, { width: 200 })
        .then(setQrCodeUrl)
        .catch(console.error)
    }
  }, [order])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="h-5 w-5" />
      case 'paid':
        return <CheckCircle className="h-5 w-5" />
      case 'preparing':
        return <Package className="h-5 w-5" />
      case 'ready':
        return <CheckCircle className="h-5 w-5" />
      case 'delivered':
        return <Truck className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">注文情報を読み込み中...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">注文が見つかりません</p>
          <Button onClick={() => navigate('/')}>ホームに戻る</Button>
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
          <h1 className="text-xl font-bold">注文確認</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              注文番号: #{order.id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Badge className={getStatusColor(order.status)}>
                {getStatusText(order.status)}
              </Badge>
            </div>
            
            {order.delivery_type === 'pickup' && order.status === 'ready' && (
              <div className="text-center">
                <p className="mb-4">店頭でこのQRコードをお見せください</p>
                {qrCodeUrl && (
                  <img 
                    src={qrCodeUrl} 
                    alt="Order QR Code" 
                    className="mx-auto border rounded-lg"
                  />
                )}
              </div>
            )}

            {order.delivery_type === 'desk' && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold">デスク配達</p>
                {order.request_time && (
                  <p className="text-sm text-muted-foreground">
                    配達予定時間: {formatJSTTime(order.request_time)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  座席: {order.user.seat_id || '未設定'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>注文内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <span className="font-semibold">{item.menu_item_name || item.menu.title}</span>
                  <span className="text-muted-foreground ml-2">× {item.qty}</span>
                </div>
                <span className="font-semibold">¥{item.menu.price * item.qty}</span>
              </div>
            ))}
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>合計</span>
                <span>¥{order.total_price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            {order.status === 'new' && (
              <p className="text-center text-muted-foreground">
                店頭でお支払いをお済ませください
              </p>
            )}
            {order.status === 'paid' && (
              <p className="text-center text-muted-foreground">
                調理開始まで少々お待ちください
              </p>
            )}
            {order.status === 'preparing' && (
              <p className="text-center text-muted-foreground">
                調理中です。完成まで少々お待ちください
              </p>
            )}
            {order.status === 'ready' && order.delivery_type === 'pickup' && (
              <p className="text-center text-muted-foreground">
                店頭でお受け取りください
              </p>
            )}
            {order.status === 'ready' && order.delivery_type === 'desk' && (
              <p className="text-center text-muted-foreground">
                まもなく配達いたします
              </p>
            )}
            {order.status === 'delivered' && (
              <p className="text-center text-muted-foreground">
                ご利用ありがとうございました
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
