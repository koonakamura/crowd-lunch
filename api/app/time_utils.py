from datetime import datetime, timezone, timedelta
from typing import Tuple

def get_jst_time() -> datetime:
    """Get current time in JST (UTC+9)"""
    jst = timezone(timedelta(hours=9))
    return datetime.now(jst)

def parse_time_slot(time_slot: str, serve_date=None) -> Tuple[datetime, datetime]:
    """Parse time slot string like '11:30～11:45' into JST datetime objects"""
    start_str, end_str = time_slot.split('～')
    start_hour, start_min = map(int, start_str.split(':'))
    end_hour, end_min = map(int, end_str.split(':'))
    
    if serve_date:
        from datetime import date
        if isinstance(serve_date, str):
            from datetime import datetime as dt
            target_date = dt.strptime(serve_date, '%Y-%m-%d').date()
        elif isinstance(serve_date, date):
            target_date = serve_date
        else:
            target_date = get_jst_time().date()
    else:
        target_date = get_jst_time().date()
        
    jst = timezone(timedelta(hours=9))
    
    start_time = datetime.combine(target_date, datetime.min.time().replace(hour=start_hour, minute=start_min))
    start_time = start_time.replace(tzinfo=jst)
    
    end_time = datetime.combine(target_date, datetime.min.time().replace(hour=end_hour, minute=end_min))
    end_time = end_time.replace(tzinfo=jst)
    
    return start_time, end_time

def is_time_slot_expired(time_slot: str, serve_date=None) -> bool:
    """Check if a time slot has expired (current JST time >= start time)"""
    current_jst = get_jst_time()
    
    if serve_date:
        from datetime import date
        if isinstance(serve_date, str):
            from datetime import datetime
            target_date = datetime.strptime(serve_date, '%Y-%m-%d').date()
        elif isinstance(serve_date, date):
            target_date = serve_date
        else:
            target_date = current_jst.date()
    else:
        target_date = current_jst.date()
    
    if target_date > current_jst.date():
        return False
        
    start_time, _ = parse_time_slot(time_slot, target_date)
    return current_jst >= start_time

def validate_delivery_time(request_time: str, serve_date=None) -> bool:
    """Validate that the requested delivery time is still available"""
    if not request_time:
        return False
    
    try:
        return not is_time_slot_expired(request_time, serve_date)
    except (ValueError, AttributeError):
        return False
