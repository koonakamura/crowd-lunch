import requests
import threading
import time
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed

def create_order(order_data, order_id):
    """Create a single order using synchronous requests"""
    try:
        response = requests.post('http://localhost:8000/orders/guest', json=order_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"Order {order_id}: Success - Order ID: {result.get('order_id', 'N/A')}")
            return result
        else:
            print(f"Order {order_id}: Failed - Status: {response.status_code}, Error: {response.text}")
            return None
    except Exception as e:
        print(f"Order {order_id}: Exception - {str(e)}")
        return None

def load_test_concurrent_orders(num_orders=10):
    """Test concurrent order creation to verify race-condition-free ID generation"""
    print(f"Starting load test with {num_orders} concurrent orders...")
    
    serve_date = date.today().strftime('%Y-%m-%d')
    
    order_requests = []
    for i in range(num_orders):
        order_data = {
            "serve_date": serve_date,
            "delivery_type": "desk",
            "request_time": "12:30",
            "department": f"負荷テスト部{i}",
            "name": f"テストユーザー{i}",
            "items": [{"menu_id": 1, "qty": 1}]
        }
        order_requests.append((order_data, i))
    
    start_time = time.time()
    results = []
    
    with ThreadPoolExecutor(max_workers=num_orders) as executor:
        future_to_order = {
            executor.submit(create_order, order_data, order_id): order_id 
            for order_data, order_id in order_requests
        }
        
        for future in as_completed(future_to_order):
            result = future.result()
            results.append(result)
    
    end_time = time.time()
    
    successful_orders = [r for r in results if r is not None]
    failed_orders = len(results) - len(successful_orders)
    
    print(f"\n=== Load Test Results ===")
    print(f"Total orders attempted: {num_orders}")
    print(f"Successful orders: {len(successful_orders)}")
    print(f"Failed orders: {failed_orders}")
    print(f"Total time: {end_time - start_time:.2f} seconds")
    print(f"Orders per second: {num_orders / (end_time - start_time):.2f}")
    
    order_ids = [order.get('order_id') for order in successful_orders if order.get('order_id')]
    unique_order_ids = set(order_ids)
    
    print(f"Unique order IDs generated: {len(unique_order_ids)}")
    print(f"Duplicate order IDs detected: {len(order_ids) - len(unique_order_ids)}")
    
    if len(order_ids) != len(unique_order_ids):
        print("⚠️  RACE CONDITION DETECTED: Duplicate order IDs found!")
        duplicates = [oid for oid in order_ids if order_ids.count(oid) > 1]
        print(f"Duplicate IDs: {set(duplicates)}")
    else:
        print("✅ Race condition test passed: All order IDs are unique")
    
    print(f"Generated order IDs: {sorted(order_ids)}")

if __name__ == "__main__":
    load_test_concurrent_orders(15)
