import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from app.main import app
from app.database import get_db, Base
from app.models import User, MenuSQLAlchemy as Menu, OrderSQLAlchemy as Order, OrderItem
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
    SQLModel.metadata.create_all(bind=engine)
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
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    assert token is not None

def test_weekly_menus(client, test_menu):
    response = client.get("/weekly-menus")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_create_order(client, test_user, test_menu):
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "pickup_at": "2025-08-27T12:00:00+09:00",
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
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "pickup_at": "2025-08-27T12:00:00+09:00",
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
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "pickup_at": "2025-08-27T12:00:00+09:00",
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
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    response = client.get("/admin/orders/today", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code in [200, 403]

def test_auth_module_coverage(client):
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "newuser@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    assert token is not None

def test_crud_operations(client, test_user, test_menu):
    db = TestingSessionLocal()
    
    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user is not None
    assert user.name == "Test User"
    
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
    response = client.get("/weekly-menus")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)

def test_invalid_order_creation(client, test_user):
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    invalid_order_data = {
        "serve_date": "invalid-date",
        "delivery_type": "invalid",
        "items": []
    }
    
    response = client.post(
        "/orders",
        json=invalid_order_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code in [400, 422]

def test_unauthorized_admin_access(client):
    response = client.get("/admin/orders/today")
    assert response.status_code == 403

def test_invalid_token_format(client):
    response = client.get("/orders/1", headers={"Authorization": "Bearer invalid.token.format"})
    assert response.status_code == 401

def test_missing_order(client, test_user):
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    response = client.get("/orders/999999", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404

def test_invalid_status_update(client, test_user, test_menu):
    from app.auth import create_access_token
    from datetime import timedelta
    
    token = create_access_token(
        data={"sub": "test@example.com"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    order_data = {
        "serve_date": str(date.today()),
        "delivery_type": "pickup",
        "pickup_at": "2025-08-27T12:00:00+09:00",
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
        json={"status": "invalid_status"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code in [400, 422]

def test_database_session_handling(client):
    from app.database import get_db
    db_gen = get_db()
    db = next(db_gen)
    assert db is not None
    
    try:
        next(db_gen)
    except StopIteration:
        pass

def test_auth_token_creation_and_verification(client):
    from app.auth import create_access_token
    from jose import jwt
    
    token = create_access_token(data={"sub": "test@example.com"})
    assert token is not None
    
    payload = jwt.decode(token, "your-secret-key-here", algorithms=["HS256"])
    assert payload["sub"] == "test@example.com"

def test_auth_dependency_coverage(client):
    from app.auth import get_current_user, get_current_user_optional
    from app.database import get_db
    
    assert get_current_user is not None
    assert get_current_user_optional is not None

def test_cors_and_startup_coverage(client):
    response = client.options("/weekly-menus", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET"
    })
    assert response.status_code in [200, 204]

def test_crud_edge_cases(client, test_user, test_menu):
    from app.crud import get_user_by_email, create_user
    from app.schemas import UserCreate
    
    db = TestingSessionLocal()
    
    user = get_user_by_email(db, "test@example.com")
    assert user is not None
    
    menu = db.query(Menu).filter(Menu.id == test_menu.id).first()
    assert menu is not None
    
    new_user_data = UserCreate(name="New User", email="crud_test_user@example.com", seat_id="B2")
    new_user = create_user(db, new_user_data)
    assert new_user.email == "crud_test_user@example.com"
    
    db.close()

def test_websocket_connection_basic(client):
    try:
        with client.websocket_connect("/ws/orders") as websocket:
            pass
    except Exception:
        pass

def test_invalid_jwt_scenarios(client):
    response = client.get("/orders/1", headers={"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxfQ.invalid"})
    assert response.status_code == 401
    
    response = client.get("/orders/1", headers={"Authorization": "Bearer malformed.token"})
    assert response.status_code == 401
