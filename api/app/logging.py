import logging
import sys
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage()
        }
        
        if hasattr(record, 'extra_data'):
            log_entry.update(record.extra_data)
            
        return json.dumps(log_entry, ensure_ascii=False)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())

root = logging.getLogger()
root.setLevel(logging.INFO)
root.handlers = [handler]

audit = logging.getLogger("audit")
order = logging.getLogger("order")

def log_audit(event, **kwargs):
    """Log audit events with structured data"""
    audit.info("", extra={'extra_data': {'event': event, **kwargs}})

def log_order_event(event, **kwargs):
    """Log order events with structured data"""
    order.info("", extra={'extra_data': {'event': event, **kwargs}})
