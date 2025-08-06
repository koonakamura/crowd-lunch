#!/usr/bin/env python3
"""
Production database seeding script for adding 8/6 and 8/7 menu entries.
This script connects to the production PostgreSQL database and adds the new menu items.
"""

import os
import sys
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import MenuSQLAlchemy
from app.database import Base

def seed_production_menus():
    """Add menu entries for 8/6 (churrasco) and 8/7 (pizza) to production database"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL to the production PostgreSQL connection string")
        sys.exit(1)
    
    print(f"Connecting to production database...")
    
    try:
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as db:
            existing_806 = db.query(MenuSQLAlchemy).filter(
                MenuSQLAlchemy.serve_date == date(2025, 8, 6)
            ).first()
            
            existing_807 = db.query(MenuSQLAlchemy).filter(
                MenuSQLAlchemy.serve_date == date(2025, 8, 7)
            ).first()
            
            menus_added = 0
            
            if not existing_806:
                menu_806 = MenuSQLAlchemy(
                    serve_date=date(2025, 8, 6),
                    title="Churrasco Special",
                    price=1200,
                    max_qty=30,
                    img_url="/uploads/AdobeStock_792531420_Preview_churrasco.jpeg"
                )
                db.add(menu_806)
                menus_added += 1
                print("✅ Added 8/6 menu: Churrasco Special (¥1200)")
            else:
                print("ℹ️  8/6 menu already exists, skipping")
            
            if not existing_807:
                menu_807 = MenuSQLAlchemy(
                    serve_date=date(2025, 8, 7),
                    title="Wood-Fired Pizza",
                    price=1100,
                    max_qty=25,
                    img_url="/uploads/AdobeStock_387834369_Preview_pizza.jpeg"
                )
                db.add(menu_807)
                menus_added += 1
                print("✅ Added 8/7 menu: Wood-Fired Pizza (¥1100)")
            else:
                print("ℹ️  8/7 menu already exists, skipping")
            
            if menus_added > 0:
                db.commit()
                print(f"✅ Successfully added {menus_added} menu entries to production database")
            else:
                print("ℹ️  No new menu entries needed")
                
    except Exception as e:
        print(f"❌ Error connecting to production database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed_production_menus()
