from app.database import SessionLocal
from app.models import Menu, MenuItem
from datetime import date

db = SessionLocal()
try:
    menus = db.query(Menu).all()
    print(f'Found {len(menus)} menus in database:')
    for menu in menus:
        print(f'  Menu ID: {menu.id}, Date: {menu.date}, Title: {menu.title}')
        items = db.query(MenuItem).filter(MenuItem.menu_id == menu.id).all()
        for item in items:
            print(f'    Item: {item.name}, Price: {item.price}, Stock: {item.stock}')
    
    print(f'\nChecking for specific date 2025-07-09:')
    target_date = date(2025, 7, 9)
    menus_for_date = db.query(Menu).filter(Menu.date == target_date).all()
    print(f'Found {len(menus_for_date)} menus for 2025-07-09')
    
finally:
    db.close()
