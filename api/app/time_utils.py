from datetime import datetime, timezone, timedelta, date, time
from typing import Tuple

def get_jst_time() -> datetime:
    """Get current time in JST (UTC+9)"""
    jst = timezone(timedelta(hours=9))
    return datetime.now(jst)

def parse_time_slot(time_slot: str, target_date: str = None) -> Tuple[datetime, datetime]:
    """Parse time slot string like '11:30～11:45' or '11:30' into JST datetime objects"""
    
    if '～' in time_slot:
        start_str, end_str = time_slot.split('～')
    else:
        start_str = time_slot
        start_hour, start_min = map(int, start_str.split(':'))
        end_min = start_min + 15
        end_hour = start_hour
        if end_min >= 60:
            end_min -= 60
            end_hour += 1
        end_str = f"{end_hour:02d}:{end_min:02d}"
    
    start_hour, start_min = map(int, start_str.split(':'))
    end_hour, end_min = map(int, end_str.split(':'))
    
    if target_date:
        from datetime import date
        try:
            base_date = date.fromisoformat(target_date)
        except (ValueError, TypeError):
            base_date = get_jst_time().date()
    else:
        base_date = get_jst_time().date()
    
    jst = timezone(timedelta(hours=9))
    
    start_time = datetime.combine(base_date, datetime.min.time().replace(hour=start_hour, minute=start_min))
    start_time = start_time.replace(tzinfo=jst)
    
    end_time = datetime.combine(base_date, datetime.min.time().replace(hour=end_hour, minute=end_min))
    end_time = end_time.replace(tzinfo=jst)
    
    return start_time, end_time

def is_time_slot_expired(time_slot: str, delivery_date: str = None) -> bool:
    """Check if a time slot has expired (current JST time >= start time)
    
    Args:
        time_slot: Time slot string like '11:30～11:45'
        delivery_date: Delivery date in 'YYYY-MM-DD' format. If None or future date, returns False
    """
    current_jst = get_jst_time()
    today_jst = current_jst.date()
    
    if delivery_date:
        from datetime import date
        try:
            target_date = date.fromisoformat(delivery_date)
            if target_date > today_jst:
                return False
        except (ValueError, TypeError):
            pass
    
    start_time, _ = parse_time_slot(time_slot, delivery_date)
    return current_jst >= start_time

def validate_delivery_time(request_time: str, delivery_date: str = None) -> bool:
    """Validate that the requested delivery time is still available (JST timezone)
    
    Args:
        request_time: Time slot string like '11:30～11:45'
        delivery_date: Delivery date in 'YYYY-MM-DD' format. If None or future date, always valid
    
    Returns:
        bool: True if time slot is available, False if expired (JST timezone based)
    """
    if not request_time:
        return False
    
    try:
        current_jst = get_jst_time()
        if current_jst.hour > 18 or (current_jst.hour == 18 and current_jst.minute >= 15):
            return False
        
        # JST timezone validation: future dates are always valid
        if delivery_date:
            from datetime import date
            try:
                target_date = date.fromisoformat(delivery_date)
                today_jst = current_jst.date()
                
                if target_date > today_jst:
                    return True
            except (ValueError, TypeError):
                pass
        
        return not is_time_slot_expired(request_time, delivery_date)
    except (ValueError, AttributeError):
        return False

def convert_to_pickup_at(serve_date: date, request_time: str) -> datetime:
    """Convert serve_date + request_time to pickup_at datetime in JST"""
    if '～' in request_time:
        start_time_str = request_time.split('～')[0]
    else:
        start_time_str = request_time
    
    start_hour, start_min = map(int, start_time_str.split(':'))
    jst = timezone(timedelta(hours=9))
    
    pickup_datetime = datetime.combine(
        serve_date, 
        datetime.min.time().replace(hour=start_hour, minute=start_min)
    )
    return pickup_datetime.replace(tzinfo=jst)

def validate_pickup_at(pickup_at: datetime) -> Tuple[bool, str]:
    """Validate pickup_at and return (is_valid, error_code)"""
    current_jst = get_jst_time()
    
    if pickup_at.date() == current_jst.date() and (current_jst.hour > 18 or (current_jst.hour == 18 and current_jst.minute >= 15)):
        return False, "cafe_time_closed"
    
    pickup_time = pickup_at.time()
    if not (time(12, 0) <= pickup_time <= time(18, 30)):
        return False, "invalid_timeslot"
    
    if pickup_at.date() == current_jst.date() and current_jst >= pickup_at:
        return False, "invalid_timeslot"
    
    return True, ""
