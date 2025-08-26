import requests
import json
from datetime import datetime, timezone, timedelta

API_BASE_URL = "https://crowd-lunch.fly.dev"

def test_scenario(pickup_time: str, description: str, expected_status: int = 200, expected_error_code: str = None, use_legacy_format: bool = False, menu_id: int = 1, test_date: str = "2025-08-27"):
    """Test order validation scenario"""
    print(f"\n=== {description} ===")
    
    if use_legacy_format:
        payload = {
            "serve_date": test_date,
            "delivery_type": "desk",
            "request_time": pickup_time,
            "delivery_location": "テスト場所",
            "department": "テスト部署",
            "name": "テストユーザー",
            "items": [{"menu_id": menu_id, "qty": 1}]
        }
    else:
        payload = {
            "serve_date": test_date,
            "delivery_type": "desk",
            "pickup_at": f"{test_date}T{pickup_time}:00+09:00",
            "request_time": pickup_time,  # Include for backward compatibility
            "delivery_location": "テスト場所",
            "department": "テスト部署",
            "name": "テストユーザー",
            "items": [{"menu_id": menu_id, "qty": 1}]
        }
    
    try:
        response = requests.post(f"{API_BASE_URL}/orders/guest", json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 422:
            try:
                error_data = response.json()
                error_code = error_data.get('detail', {}).get('code', 'unknown')
                message = error_data.get('detail', {}).get('message', 'unknown')
                print(f"Error Code: {error_code}")
                print(f"Message: {message}")
                
                if expected_error_code and error_code == expected_error_code:
                    print("✅ Expected error code matched!")
                elif expected_error_code:
                    print(f"❌ Expected {expected_error_code}, got {error_code}")
            except json.JSONDecodeError:
                print(f"❌ Could not parse error response: {response.text}")
        elif response.status_code == expected_status:
            print("✅ Success!")
        else:
            print(f"❌ Unexpected status code. Expected {expected_status}, got {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("Testing Order Validation Scenarios")
    print("=" * 50)
    
    test_scenario("12:30", "12:30 (通常帯) → 成功", expected_status=200)
    test_scenario("14:30", "14:30 + cafe menu (menu_id=1) → 成功", expected_status=200, menu_id=1)
    test_scenario("14:30", "14:30 + non-cafe menu (menu_id=2) → menu_not_available", expected_status=422, expected_error_code="menu_not_available", menu_id=2)
    test_scenario("18:45", "18:45 → invalid_timeslot", expected_status=422, expected_error_code="invalid_timeslot")
    test_scenario("10:30", "10:30 → invalid_timeslot (before cafe time)", expected_status=422, expected_error_code="invalid_timeslot")
    
    today = datetime.now().strftime("%Y-%m-%d")
    test_scenario("18:15", f"18:15 today ({today}) → cafe_time_closed", expected_status=422, expected_error_code="cafe_time_closed", test_date=today)
    
    print("\n" + "=" * 50)
    print("Testing Legacy Format (request_time only)")
    print("=" * 50)
    
    test_scenario("12:30～12:45", "Legacy 12:30～12:45 → 成功", expected_status=200, use_legacy_format=True)
    test_scenario("14:30～14:45", "Legacy 14:30～14:45 + non-cafe menu → menu_not_available", expected_status=422, expected_error_code="menu_not_available", use_legacy_format=True, menu_id=2)
