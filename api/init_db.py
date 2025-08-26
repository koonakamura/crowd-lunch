from app.database import engine, Base
from app.models import User, MenuSQLAlchemy, OrderSQLAlchemy, OrderItem

def init_database():
    """Initialize database tables using current models."""
    Base.metadata.create_all(bind=engine)
    print('Database tables created successfully')

if __name__ == "__main__":
    init_database()
