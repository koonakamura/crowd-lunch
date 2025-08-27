from locust import HttpUser, task, between
import json
from datetime import date
import random

class OrderUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup for each user - authenticate and get JWT token"""
        from app.auth import create_access_token
        from datetime import timedelta
        
        self.serve_date = date.today().strftime('%Y-%m-%d')
        
        self.token = create_access_token(
            data={"sub": "test@example.com"}, 
            expires_delta=timedelta(minutes=15)
        )
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    @task
    def create_guest_order(self):
        """Create a guest order to test race-condition-free ID generation"""
        if not self.token:
            return
            
        order_data = {
            "serve_date": self.serve_date,
            "delivery_type": "desk",
            "request_time": "12:30",
            "department": f"負荷テスト部{random.randint(1, 1000)}",
            "name": f"テストユーザー{random.randint(1, 1000)}",
            "items": [{"menu_id": 1, "qty": 1}]
        }
        
        with self.client.post("/orders/guest", 
                            json=order_data,
                            headers=self.headers,
                            catch_response=True) as response:
            if response.status_code == 200:
                result = response.json()
                order_id = result.get('order_id')
                if order_id and order_id.startswith('#'):
                    response.success()
                else:
                    response.failure(f"Invalid order ID format: {order_id}")
            else:
                response.failure(f"Request failed: {response.status_code}")
