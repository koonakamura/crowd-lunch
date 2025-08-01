import sqlite3
from datetime import datetime, date
import os

db_path = os.path.join(os.path.dirname(__file__), 'crowdlunch.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

today = date.today().strftime('%Y-%m-%d')

cursor.execute("""
INSERT OR REPLACE INTO menus (id, serve_date, title, price, max_qty, img_url, created_at)
VALUES (1, ?, 'Chicken Teriyaki', 800, 50, '/uploads/chicken.jpg', ?)
""", (today, datetime.now()))

cursor.execute("""
INSERT OR REPLACE INTO menus (id, serve_date, title, price, max_qty, img_url, created_at)
VALUES (2, ?, 'Beef Curry', 900, 30, '/uploads/beef.jpg', ?)
""", (today, datetime.now()))

cursor.execute("""
INSERT OR REPLACE INTO menus (id, serve_date, title, price, max_qty, img_url, created_at)
VALUES (3, ?, 'Salmon Bento', 1000, 25, '/uploads/salmon.jpg', ?)
""", (today, datetime.now()))


conn.commit()
conn.close()

print(f"Sample menu data added for date: {today}")
print("Added 3 sample menus: Chicken Teriyaki (¥800), Beef Curry (¥900), Salmon Bento (¥1000)")
