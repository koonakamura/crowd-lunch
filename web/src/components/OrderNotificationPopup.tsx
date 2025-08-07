import { toast } from '../hooks/use-toast'
import { Order } from '../lib/api'

export function showOrderNotification(order: Order) {
  const menuItems = order.order_items.map(item => item.menu.title).join('、')
  const customerInfo = order.customer_name || order.user.name
  const department = order.department || '部署不明'
  const deliveryLocation = order.delivery_location || 'お受け取り'
  
  toast({
    title: "新規注文",
    description: `${customerInfo}（${department}）／${menuItems}／${order.total_price.toLocaleString()}円／${deliveryLocation}`,
    duration: 8000,
  })
}
