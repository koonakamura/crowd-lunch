import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models import User, Menu, Order, OrderItem
from datetime import date, time

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_user(client):
    db = TestingSessionLocal()
    existing_user = db.query(User).filter(User.email == "test@example.com").first()
    if existing_user:
        db.close()
        return existing_user
    
    user = User(name="Test User", email="test@example.com", seat_id="A1")
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user

@pytest.fixture
def test_menu(client):
    db = TestingSessionLocal()
    existing_menu = db.query(Menu).filter(
        Menu.serve_date == date.today(),
        Menu.title == "Test Menu"
    ).first()
    if existing_menu:
        db.close()
        return existing_menu
    
    menu = Menu(
        serve_date=date.today(),
        title="Test Menu",
        price=500,
        max_qty=10,
        img_url="/test.jpg"
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    db.close()
    return menu

def test_login(client):
    response = client.post("/auth/login", json={"email": "test@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"

def test_weekly_menus(client, test_menu):
    response = client.get("/menus/weekly")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_create_order(client, test_user, test_menu):
    login_response = client.post("/auth/login", json={"email": "test@example.com"})
    token = login_response.json()["access_token"]
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "items": [{"menu_id": test_menu.id, "qty": 1}]
    }
    
    response = client.post(
        "/orders",
        json=order_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_type"] == "pickup"
    assert len(data["order_items"]) == 1

def test_get_order(client, test_user, test_menu):
    login_response = client.post("/auth/login", json={"email": "test@example.com"})
    token = login_response.json()["access_token"]
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "items": [{"menu_id": test_menu.id, "qty": 1}]
    }
    
    create_response = client.post(
        "/orders",
        json=order_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    order_id = create_response.json()["id"]
    
    response = client.get(f"/orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order_id

def test_update_order_status(client, test_user, test_menu):
    login_response = client.post("/auth/login", json={"email": "test@example.com"})
    token = login_response.json()["access_token"]
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "items": [{"menu_id": test_menu.id, "qty": 1}]
    }
    
    create_response = client.post(
        "/orders",
        json=order_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    order_id = create_response.json()["id"]
    
    response = client.patch(
        f"/orders/{order_id}/status",
        json={"status": "paid"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code in [200, 403]

def test_admin_today_orders(client, test_user, test_menu):
    login_response = client.post("/auth/login", json={"email": "test@example.com"})
    token = login_response.json()["access_token"]
    
    response = client.get("/admin/orders/today", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code in [200, 403]

def test_auth_module_coverage(client):
    response = client.post("/auth/login", json={"email": "newuser@example.com"})
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    assert token is not None

def test_crud_operations(client, test_user, test_menu):
    db = TestingSessionLocal()
    
    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user is not None
    assert user.name == "test"
    
    menu = db.query(Menu).filter(Menu.title == "Test Menu").first()
    assert menu is not None
    assert menu.price == 500
    
    db.close()

def test_database_connection(client):
    from sqlalchemy import text
    db = TestingSessionLocal()
    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1
    db.close()

def test_error_handling(client):
    response = client.get("/orders/999999", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401

def test_menu_endpoints_coverage(client, test_menu):
    response = client.get("/menus/weekly")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
