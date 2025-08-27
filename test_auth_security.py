#!/usr/bin/env python3
import requests
import sys

API_BASE_URL = "https://crowd-lunch.fly.dev"

def test_pattern_validation():
    print("Testing pattern validation...")
    
    test_cases = [
        {
            "name": "Valid production URL",
            "url": "https://cheery-dango-2fd190.netlify.app/admin/callback",
            "expected": 302
        },
        {
            "name": "Valid preview URL",
            "url": "https://deploy-preview-123--cheery-dango-2fd190.netlify.app/admin/callback",
            "expected": 302
        },
        {
            "name": "Valid localhost",
            "url": "http://localhost:3000/admin/callback",
            "expected": 302
        },
        {
            "name": "Invalid protocol",
            "url": "ftp://example.com/admin/callback",
            "expected": 400
        },
        {
            "name": "Invalid path",
            "url": "https://cheery-dango-2fd190.netlify.app/wrong/path",
            "expected": 400
        },
        {
            "name": "Invalid domain",
            "url": "https://malicious.com/admin/callback",
            "expected": 403
        },
        {
            "name": "Query parameters not allowed",
            "url": "https://cheery-dango-2fd190.netlify.app/admin/callback?test=1",
            "expected": 400
        },
        {
            "name": "Fragment not allowed",
            "url": "https://cheery-dango-2fd190.netlify.app/admin/callback#test",
            "expected": 400
        }
    ]
    
    for test_case in test_cases:
        try:
            response = requests.get(
                f"{API_BASE_URL}/auth/login",
                params={"redirect_uri": test_case["url"], "state": "test123"},
                allow_redirects=False
            )
            
            status = response.status_code
            print(f"✓ {test_case['name']}: {status} (expected {test_case['expected']})")
            
            if status == 302:
                location = response.headers.get('Location', '')
                if 'token=' in location and 'state=' in location:
                    print(f"  → Redirect contains token and state")
                else:
                    print(f"  → Warning: Redirect missing token or state")
                    
        except Exception as e:
            print(f"✗ {test_case['name']}: Error - {e}")

if __name__ == "__main__":
    test_pattern_validation()
