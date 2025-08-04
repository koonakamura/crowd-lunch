#!/usr/bin/env python3
"""Test JST timezone validation logic"""

import sys
sys.path.append('.')

from datetime import date, datetime, timezone, timedelta
from app.time_utils import validate_delivery_time, is_time_slot_expired, get_jst_time

def test_jst_validation():
    print("=== JST Timezone Validation Test ===")
    
    current_jst = get_jst_time()
    today_jst = current_jst.date()
    tomorrow_jst = date(today_jst.year, today_jst.month, today_jst.day + 1)
    
    print(f"Current JST time: {current_jst}")
    print(f"Today JST: {today_jst}")
    print(f"Tomorrow JST: {tomorrow_jst}")
    print()
    
    print("Testing future date validation:")
    future_dates = [
        str(tomorrow_jst),
        "2025-08-05",
        "2025-08-06",
        "2025-12-31"
    ]
    
    for future_date in future_dates:
        result = validate_delivery_time("12:45～13:00", future_date)
        expired = is_time_slot_expired("12:45～13:00", future_date)
        print(f"  Date: {future_date}")
        print(f"    validate_delivery_time: {result} (should be True)")
        print(f"    is_time_slot_expired: {expired} (should be False)")
        print()
    
    print("Testing current day validation:")
    today_str = str(today_jst)
    
    test_slots = ["11:30～11:45", "12:45～13:00", "13:45～14:00"]
    
    for slot in test_slots:
        result = validate_delivery_time(slot, today_str)
        expired = is_time_slot_expired(slot, today_str)
        print(f"  Time slot: {slot} (today: {today_str})")
        print(f"    validate_delivery_time: {result}")
        print(f"    is_time_slot_expired: {expired}")
        print()

if __name__ == "__main__":
    test_jst_validation()
