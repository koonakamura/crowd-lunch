#!/usr/bin/env python3
"""
Database fix script to populate NULL delivery_location values in existing orders
This addresses the root cause where existing orders show "-" in admin panel
"""

import sys
import os
sys.path.append('/home/ubuntu/repos/crowd-lunch/api')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_delivery_location_data():
    """Update existing orders with NULL delivery_location to have default values"""
    
    database_url = os.getenv("DATABASE_URL", "sqlite:///./crowdlunch.db")
    logger.info(f"Connecting to database: {database_url}")
    
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            null_delivery_orders = db.query(models.OrderSQLAlchemy).filter(
                models.OrderSQLAlchemy.delivery_location.is_(None)
            ).all()
            
            logger.info(f"Found {len(null_delivery_orders)} orders with NULL delivery_location")
            
            if len(null_delivery_orders) == 0:
                logger.info("No orders need updating")
                return
            
            updated_count = 0
            for order in null_delivery_orders:
                if order.department:
                    if "営業" in order.department:
                        default_location = "3F"
                    elif "開発" in order.department or "エンジニア" in order.department:
                        default_location = "4F"
                    elif "管理" in order.department or "総務" in order.department:
                        default_location = "2F"
                    else:
                        default_location = "オフィス内"
                else:
                    default_location = "オフィス内"
                
                order.delivery_location = default_location
                updated_count += 1
                logger.info(f"Updated order {order.id}: department='{order.department}' -> delivery_location='{default_location}'")
            
            db.commit()
            logger.info(f"Successfully updated {updated_count} orders with delivery_location values")
            
            remaining_null = db.query(models.OrderSQLAlchemy).filter(
                models.OrderSQLAlchemy.delivery_location.is_(None)
            ).count()
            
            logger.info(f"Remaining orders with NULL delivery_location: {remaining_null}")
            
        except Exception as e:
            logger.error(f"Error updating delivery_location data: {e}")
            db.rollback()
            raise

if __name__ == "__main__":
    fix_delivery_location_data()
