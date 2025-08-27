import requests
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from app.time_utils import validate_pickup_at

def test_cafe_time_closed_validation():
    """Test that cafe_time_closed validation works correctly"""
    print("Testing cafe_time_closed validation logic")
    print("=" * 50)
    
    today = datetime.now(timezone(timedelta(hours=9))).date()
    pickup_at = datetime.combine(today, datetime.min.time().replace(hour=18, minute=15))
    pickup_at = pickup_at.replace(tzinfo=timezone(timedelta(hours=9)))
    
    print(f"Testing pickup_at: {pickup_at}")
    
    mock_current_time = datetime.combine(today, datetime.min.time().replace(hour=18, minute=16))
    mock_current_time = mock_current_time.replace(tzinfo=timezone(timedelta(hours=9)))
    
    print(f"Mocking current time to: {mock_current_time}")
    
    with patch('app.time_utils.get_jst_time', return_value=mock_current_time):
        is_valid, error_code = validate_pickup_at(pickup_at)
        print(f"Validation result: is_valid={is_valid}, error_code='{error_code}'")
        
        if not is_valid and error_code == "cafe_time_closed":
            print("✅ cafe_time_closed validation works correctly!")
        else:
            print(f"❌ Expected cafe_time_closed, got: {error_code}")

if __name__ == "__main__":
    test_cafe_time_closed_validation()
