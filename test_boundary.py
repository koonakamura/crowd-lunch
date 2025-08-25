import requests
import json
from datetime import datetime, timezone, timedelta

def test_cafe_time_boundary():
    """Test the critical 18:15 boundary condition"""
    
    response = requests.post('http://localhost:8001/orders/guest', 
        headers={'Content-Type': 'application/json'},
        json={
            'serve_date': '2025-08-25',
            'delivery_type': 'desk',
            'request_time': '18:15',
            'delivery_location': '5F', 
            'department': 'テスト部署',
            'name': 'テストユーザー',
            'items': [{'menu_id': 1, 'qty': 1}]
        })
    
    print('=== 18:15 Boundary Test ===')
    print('Status:', response.status_code)
    try:
        result = response.json()
        print('Response:', json.dumps(result, ensure_ascii=False, indent=2))
        
        if response.status_code == 422 and 'detail' in result:
            detail = result['detail']
            if isinstance(detail, dict) and detail.get('code') == 'menu_not_available':
                print('✅ PASS: Correct menu_not_available error during cafe time')
            elif isinstance(detail, dict) and detail.get('code') == 'cafe_time_closed':
                print('✅ PASS: Correct cafe_time_closed error at 18:15')
            else:
                print('❌ FAIL: Unexpected error code')
        else:
            print('❌ FAIL: Expected 422 status with structured error')
            
    except Exception as e:
        print('Raw response:', response.text[:200])
        print('Error parsing JSON:', e)

if __name__ == '__main__':
    test_cafe_time_boundary()
