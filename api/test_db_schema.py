from app.database import engine
from sqlalchemy import inspect

def check_database_schema():
    """Check if SQLModel tables exist in the database"""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print('Available tables:', tables)
        
        sqlmodel_tables = ['menu', 'menuitem', 'order']
        for table in sqlmodel_tables:
            if table in tables:
                columns = inspector.get_columns(table)
                print(f'{table} columns:', [col['name'] for col in columns])
            else:
                print(f'Table {table} not found')
        
        sqlalchemy_tables = ['menus', 'orders', 'order_items', 'users']
        for table in sqlalchemy_tables:
            if table in tables:
                print(f'Existing table {table} found')
            else:
                print(f'Existing table {table} not found')
                
    except Exception as e:
        print(f'Error checking database schema: {e}')

if __name__ == "__main__":
    check_database_schema()
