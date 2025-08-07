#!/usr/bin/env python3
"""
Script to verify that the production deployment is working correctly.
Tests API endpoints and image accessibility.
"""

import requests
import json
from datetime import date

def test_production_api():
    """Test the production API endpoints"""
    
    base_url = "https://crowd-lunch.fly.dev"
    
    print("🔍 Testing production API endpoints...")
    
    try:
        response = requests.get(f"{base_url}/menus/weekly")
        response.raise_for_status()
        
        menus_data = response.json()
        print(f"✅ Weekly menus API: {response.status_code}")
        
        dates_found = []
        for day_data in menus_data:
            dates_found.append(day_data["date"])
            if day_data["date"] == "2025-08-06":
                menus = day_data["menus"]
                if menus:
                    menu = menus[0]
                    print(f"   📅 8/6 menu: {menu['title']} (¥{menu['price']}) - {menu['max_qty']} available")
                else:
                    print("   ❌ 8/6 menu: No menus found")
            elif day_data["date"] == "2025-08-07":
                menus = day_data["menus"]
                if menus:
                    menu = menus[0]
                    print(f"   📅 8/7 menu: {menu['title']} (¥{menu['price']}) - {menu['max_qty']} available")
                else:
                    print("   ❌ 8/7 menu: No menus found")
        
        print(f"   📊 Dates returned: {dates_found}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Weekly menus API failed: {e}")
    
    images_to_test = [
        "/uploads/AdobeStock_792531420_Preview_churrasco.jpeg",
        "/uploads/AdobeStock_387834369_Preview_pizza.jpeg"
    ]
    
    print("\n🖼️  Testing image accessibility...")
    for image_path in images_to_test:
        try:
            response = requests.head(f"{base_url}{image_path}")
            if response.status_code == 200:
                print(f"✅ Image accessible: {image_path}")
            else:
                print(f"❌ Image not accessible: {image_path} (HTTP {response.status_code})")
        except requests.exceptions.RequestException as e:
            print(f"❌ Image test failed: {image_path} - {e}")

def test_netlify_frontend():
    """Test the Netlify frontend"""
    
    print("\n🌐 Testing Netlify frontend...")
    
    try:
        response = requests.get("https://cheery-dango-2fd190.netlify.app/")
        response.raise_for_status()
        print(f"✅ Netlify frontend: {response.status_code}")
        
        if "CROWD LUNCH" in response.text:
            print("   ✅ Page contains expected title")
        else:
            print("   ❌ Page missing expected title")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Netlify frontend failed: {e}")

if __name__ == "__main__":
    print("🔍 Verifying production deployment...\n")
    test_production_api()
    test_netlify_frontend()
    print("\n✅ Production verification complete!")
