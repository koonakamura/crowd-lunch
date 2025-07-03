# Crowd Lunch - ランチ予約システム

社員がスマホWebからランチを事前予約し、並ばず購入できるシステムです。

## 🎨 Design

Adobe XD プロトタイプ: https://xd.adobe.com/view/6f6aa481-e9a3-4aae-9cb7-aab890f038e1-3a39/

### Design Token 取得方法
1. Adobe XD の「開発モード」を開く
2. アセット（色/アイコン/画像）をエクスポート
3. `/apps/web/public/assets` に配置
4. カラー/フォントは `tailwind.config.js` の `theme.extend` に追加

## 🚀 Quick Start

```bash
# リポジトリをクローン
git clone https://github.com/koonaka/crowd-lunch.git
cd crowd-lunch

# Docker Compose で全サービス起動
docker compose up

# アクセス
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## 🏗️ Architecture

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + PWA
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy + Alembic
- **Infrastructure**: Docker Compose + GitHub Actions CI

## 📱 Features

1. **Home** (`/`) - 週間メニュー表示、残数確認
2. **Order** (`/order`) - 注文詳細入力、受取方法選択
3. **Confirm** (`/order/confirm`) - 注文確認、QRコード表示
4. **Admin** (`/admin`) - 注文管理、ステータス更新

## 🗄️ Database Schema

```sql
users(id, name, email, seat_id, created_at)
menus(id, serve_date, title, price, max_qty, img_url, created_at)
orders(id, user_id, serve_date, delivery_type, request_time, total_price, status, created_at)
order_items(id, order_id, menu_id, qty)
```

## 🔧 Development

### Backend (FastAPI)

```bash
cd api
poetry install
poetry run fastapi dev app/main.py
```

### Frontend (Next.js)

```bash
cd web
npm install
npm run dev
```

### Database Migration

```bash
cd api
poetry run alembic upgrade head
```

## 🧪 Testing

```bash
# Backend tests
cd api
poetry run pytest

# Frontend linting
cd web
npm run lint
```

## 📋 Project Phases

- **Phase 0**: リポジトリ & CI 初期化
- **Phase 1**: DB & API 実装
- **Phase 2**: UI Skeleton (XD 取込)
- **Phase 3**: 状態管理 & WebSocket
- **Phase 4**: Cron & 在庫締切
- **Phase 5**: 結合テスト / README

## 🚀 Deployment

GitHub Actions により自動デプロイ:
1. PR: pytest / eslint / next build
2. main: docker build → ghcr.io → AWS ECS(Fargate)

## 👥 Contributors

- [@koonaka](https://github.com/koonaka)
- Devin AI Integration
