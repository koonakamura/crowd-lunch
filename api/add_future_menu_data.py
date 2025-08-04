#!/usr/bin/env python3
"""Add sample menu data for future dates to test future date ordering"""

import sys
sys.path.append('.')

from datetime import date, timedelta
from app.database import get_db
from app.models import MenuSQLAlchemy
from app.time_utils import get_jst_time

def add_future_menu_data():
    print("Adding sample menu data for future dates...")
    
    today = get_jst_time().date()
    future_dates = [today + timedelta(days=i) for i in range(1, 7)]  # 8/5 to 8/10
    
    db = next(get_db())
    
    try:
        for future_date in future_dates:
            date_str = str(future_date)
            print(f'Adding menu data for {date_str}...')
            
            existing = db.query(MenuSQLAlchemy).filter(MenuSQLAlchemy.serve_date == future_date).first()
            if existing:
                print(f'  Menus already exist for {date_str}, skipping')
                continue
            
            menus = [
                MenuSQLAlchemy(
                    serve_date=future_date,
                    title='Chicken Teriyaki',
                    price=800,
                    max_qty=50,
                    img_url='/uploads/chicken.jpg',
                    created_at=get_jst_time()
                ),
                MenuSQLAlchemy(
                    serve_date=future_date,
                    title='Beef Curry', 
                    price=900,
                    max_qty=30,
                    img_url='/uploads/beef.jpg',
                    created_at=get_jst_time()
                ),
                MenuSQLAlchemy(
                    serve_date=future_date,
                    title='Salmon Bento',
                    price=1000,
                    max_qty=25,
                    img_url='/uploads/salmon.jpg',
                    created_at=get_jst_time()
                )
            ]
            
            for menu in menus:
                db.add(menu)
            
            print(f'  Added 3 menu items for {date_str}')
        
        db.commit()
        print('Future date menu data added successfully!')
        
    except Exception as e:
        print(f'Error adding future menu data: {e}')
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_future_menu_data()
