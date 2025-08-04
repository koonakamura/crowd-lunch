from datetime import datetime, date
from app.database import SessionLocal
from app.models import MenuSQLAlchemy
from app.time_utils import get_jst_time

def create_sample_menus():
    db = SessionLocal()
    try:
        today = date.today()
        
        existing_menus = db.query(MenuSQLAlchemy).filter(MenuSQLAlchemy.serve_date == today).count()
        if existing_menus > 0:
            print(f"Sample menus already exist for {today}")
            return
        
        menus = [
            MenuSQLAlchemy(
                serve_date=today,
                title="Chicken Teriyaki",
                price=800,
                max_qty=50,
                img_url="/uploads/chicken.jpg",
                created_at=get_jst_time()
            ),
            MenuSQLAlchemy(
                serve_date=today,
                title="Beef Curry", 
                price=900,
                max_qty=30,
                img_url="/uploads/beef.jpg",
                created_at=get_jst_time()
            ),
            MenuSQLAlchemy(
                serve_date=today,
                title="Salmon Bento",
                price=1000,
                max_qty=25,
                img_url="/uploads/salmon.jpg",
                created_at=get_jst_time()
            )
        ]
        
        for menu in menus:
            db.add(menu)
        
        db.commit()
        print(f"Sample menu data added for date: {today}")
        print("Added 3 sample menus: Chicken Teriyaki (¥800), Beef Curry (¥900), Salmon Bento (¥1000)")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating sample menus: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_menus()
