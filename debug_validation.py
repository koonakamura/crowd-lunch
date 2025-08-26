import requests
import json
from datetime import datetime, timezone, timedelta

current_jst = datetime.now(timezone(timedelta(hours=9)))
print(f'Current JST time: {current_jst}')
print(f'Current hour: {current_jst.hour}, minute: {current_jst.minute}')

pickup_at = datetime.fromisoformat('2025-08-27T12:30:00+09:00')
print(f'Pickup at: {pickup_at}')
print(f'Pickup time: {pickup_at.time()}')
print(f'Is pickup >= 12:00? {pickup_at.time() >= datetime.min.time().replace(hour=12, minute=0)}')
print(f'Is pickup <= 18:30? {pickup_at.time() <= datetime.min.time().replace(hour=18, minute=30)}')
