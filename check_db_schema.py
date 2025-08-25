import sqlite3

conn = sqlite3.connect('api/crowdlunch.db')
cursor = conn.cursor()

print("=== Menus table schema ===")
cursor.execute('PRAGMA table_info(menus)')
columns = cursor.fetchall()
for col in columns:
    print(f'  {col[1]} {col[2]} (nullable: {not col[3]}, default: {col[4]})')

print("\n=== Sample menu data ===")
cursor.execute('SELECT id, title, cafe_time_available FROM menus LIMIT 5')
rows = cursor.fetchall()
for row in rows:
    print(f'  ID: {row[0]}, Title: {row[1]}, Cafe Available: {row[2]}')

conn.close()
