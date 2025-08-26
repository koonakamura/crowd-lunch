import requests
import json

API_BASE_URL = "https://crowd-lunch.fly.dev"

test_menu = {
    "serve_date": "2025-08-27",
    "title": "ランチ専用メニュー",
    "price": 15,
    "max_qty": 5,
    "cafe_time_available": False
}

try:
    response = requests.post(f"{API_BASE_URL}/menus", json=test_menu, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
