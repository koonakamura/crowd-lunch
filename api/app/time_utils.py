from datetime import datetime, timezone, timedelta
from typing import Tuple

def get_jst_time() -> datetime:
    """Get current time in JST (UTC+9)"""
    jst = timezone(timedelta(hours=9))
    return datetime.now(jst)

def parse_time_slot(time_slot: str, target_date: str = None) -> Tuple[datetime, datetime]:
    """Parse time slot string like '11:30～11:45' into JST datetime objects"""
    start_str, end_str = time_slot.split('～')
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
    if delivery_date:
        from datetime import date
        try:
            target_date = date.fromisoformat(delivery_date)
            today = get_jst_time().date()
            
            if target_date > today:
                return False
        except (ValueError, TypeError):
            pass
    
    current_jst = get_jst_time()
    start_time, _ = parse_time_slot(time_slot, delivery_date)
    return current_jst >= start_time

def validate_delivery_time(request_time: str, delivery_date: str = None) -> bool:
    """Validate that the requested delivery time is still available
    
    Args:
        request_time: Time slot string like '11:30～11:45'
        delivery_date: Delivery date in 'YYYY-MM-DD' format. If None or future date, always valid
    """
    if not request_time:
        return False
    
    try:
        return not is_time_slot_expired(request_time, delivery_date)
    except (ValueError, AttributeError):
        return False
