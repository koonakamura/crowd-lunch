#!/usr/bin/env python3
import sys
sys.path.append('/home/ubuntu/repos/crowd-lunch/api')

from app.auth import create_access_token
from datetime import timedelta
import json
import base64

print("Testing JWT creation with iss/aud claims...")

token = create_access_token(
    data={
        'sub': 'admin@example.com',
        'iss': 'crowd-lunch-api', 
        'aud': 'crowd-lunch-admin',
        'role': 'admin'
    }, 
    expires_delta=timedelta(minutes=15)
)

print(f"Generated token: {token}")

parts = token.split('.')
payload_b64 = parts[1]
payload_b64 += '=' * (4 - len(payload_b64) % 4)
payload = json.loads(base64.b64decode(payload_b64))
print('JWT payload:', json.dumps(payload, indent=2))

print("\nChecking for required claims:")
required_claims = ['sub', 'exp', 'iss', 'aud', 'role']
for claim in required_claims:
    if claim in payload:
        print(f"✅ {claim}: {payload[claim]}")
    else:
        print(f"❌ Missing claim: {claim}")
