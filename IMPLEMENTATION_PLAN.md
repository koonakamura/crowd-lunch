# ランチモバイルオーダーシステム実装計画

## 現状分析と要件ギャップ

### 既存システムの機能
✅ **既に実装済み**:
- FastAPI + React TypeScript アーキテクチャ
- PostgreSQL データベース
- ユーザー・メニュー・注文管理の基本CRUD
- 管理者認証システム
- WebSocket リアルタイム通知
- 時間バリデーション（time_utils.py）
- 基本的な注文フロー

### 要件定義書との主要ギャップ

#### 🔴 **高優先度 - 新規実装が必要**
1. **15分単位時間枠管理** (要件2,3,4)
   - 現状: pickup_at フィールドのみ
   - 必要: TimeSlot モデル + 20件上限管理 + 30分前締切

2. **オンライン決済統合** (要件5,6)
   - 現状: 決済機能なし（「タッチ決済」表示のみ）
   - 必要: クレジットカード + QR決済 + 3Dセキュア2.0

3. **法務ページ管理** (要件14)
   - 現状: なし
   - 必要: 特商法・プライバシーポリシー・利用規約の生成・管理

4. **POS・会計ソフト連携** (要件12,13)
   - 現状: なし
   - 必要: CSV出力 + API連携（freee/弥生）

#### 🟡 **中優先度 - 拡張が必要**
5. **在庫・売切れ管理** (要件9)
   - 現状: 基本的なメニュー管理のみ
   - 必要: 在庫数・日次上限・売切れ表示

6. **キャンセル・返金フロー** (要件15)
   - 現状: なし
   - 必要: 30分前まで自己キャンセル + 返金API連携

7. **通知システム拡張** (要件16)
   - 現状: WebSocket通知のみ
   - 必要: メール通知 + リマインダー

#### 🟢 **低優先度 - 改善・追加**
8. **売上・分析レポート** (要件18)
9. **注文履歴・リピート注文** (要件21)
10. **PWA対応** (要件20)

## 実装フェーズ計画

### Phase 1: コア機能実装 (2-3週間)
#### 1.1 時間枠管理システム
- [ ] TimeSlot モデル作成
- [ ] 15分単位枠生成ロジック
- [ ] 20件上限管理
- [ ] 30分前締切バリデーション
- [ ] フロントエンド時間枠選択UI

#### 1.2 決済システム統合
- [ ] 決済ゲートウェイ選定・契約
- [ ] Payment/Refund モデル
- [ ] クレジットカード決済フロー
- [ ] QR決済フロー
- [ ] 3Dセキュア2.0対応
- [ ] Webhook受信・署名検証

#### 1.3 注文フロー改修
- [ ] 事前決済必須化
- [ ] 注文確定ロジック修正
- [ ] 電子レシート生成
- [ ] 注文確認メール送信

### Phase 2: 管理・連携機能 (2週間)
#### 2.1 法務ページ管理
- [ ] LegalDocument モデル
- [ ] テンプレート生成システム
- [ ] 管理画面での編集機能
- [ ] 公開URL生成

#### 2.2 POS・会計連携
- [ ] CSV出力機能
- [ ] freee API連携
- [ ] 弥生 API連携
- [ ] 売上集計・税区分管理

#### 2.3 在庫・売切れ管理
- [ ] 在庫数フィールド追加
- [ ] 日次上限設定
- [ ] 売切れ表示ロジック
- [ ] 管理画面での在庫管理

### Phase 3: 運用・改善機能 (1-2週間)
#### 3.1 キャンセル・返金
- [ ] キャンセルフロー実装
- [ ] 返金API連携
- [ ] 管理画面でのキャンセル管理

#### 3.2 通知システム拡張
- [ ] メール通知基盤
- [ ] リマインダー機能
- [ ] 店舗向け通知

#### 3.3 売上レポート
- [ ] 売上集計機能
- [ ] 時間枠稼働率計算
- [ ] CSV エクスポート

## 技術実装詳細

### データベーススキーマ拡張

```sql
-- 時間枠管理
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(id),
    slot_datetime TIMESTAMP NOT NULL,
    max_orders INTEGER DEFAULT 20,
    current_orders INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 決済情報
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL, -- 'credit_card', 'qr_code'
    payment_gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    amount INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 返金情報
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    gateway_refund_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 法務文書
CREATE TABLE legal_documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL, -- 'terms', 'privacy', 'commerce_law'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 在庫管理
ALTER TABLE menus ADD COLUMN stock_quantity INTEGER DEFAULT NULL;
ALTER TABLE menus ADD COLUMN daily_limit INTEGER DEFAULT NULL;
ALTER TABLE menus ADD COLUMN is_available BOOLEAN DEFAULT true;
```

### API エンドポイント拡張

```python
# 時間枠管理
GET /api/time-slots/{date}  # 利用可能時間枠取得
POST /api/time-slots/{slot_id}/reserve  # 時間枠予約

# 決済
POST /api/payments/create  # 決済開始
POST /api/payments/webhook  # 決済完了通知
POST /api/refunds  # 返金処理

# 法務ページ
GET /api/legal/{document_type}  # 法務文書取得
POST /api/admin/legal  # 法務文書更新

# POS連携
GET /api/admin/export/pos-csv  # POS用CSV出力
POST /api/admin/accounting/sync  # 会計ソフト同期
```

### フロントエンド コンポーネント拡張

```typescript
// 時間枠選択
components/TimeSlotPicker.tsx
components/TimeSlotGrid.tsx

// 決済
components/PaymentForm.tsx
components/CreditCardForm.tsx
components/QRPaymentForm.tsx

// 管理画面
components/admin/TimeSlotManager.tsx
components/admin/LegalDocumentEditor.tsx
components/admin/InventoryManager.tsx
components/admin/SalesReport.tsx
```

## セキュリティ・コンプライアンス対応

### 決済セキュリティ
- [ ] PCI DSS準拠の決済代行業者選定
- [ ] カード情報非保持（トークン化）
- [ ] 3Dセキュア2.0実装
- [ ] Webhook署名検証

### 個人情報保護
- [ ] 暗号化（TLS1.2+, AES-256）
- [ ] APPI準拠のプライバシーポリシー
- [ ] データ保持期間設定
- [ ] 管理画面2要素認証

### 法令対応
- [ ] 特定商取引法表記
- [ ] インボイス制度対応
- [ ] 景品表示法準拠

## パフォーマンス・可用性対策

### パフォーマンス
- [ ] メニューAPIのCDNキャッシュ
- [ ] 時間枠計算のメモ化
- [ ] N+1クエリ対策
- [ ] 画像最適化（WebP/AVIF）

### 可用性
- [ ] ヘルスチェックエンドポイント
- [ ] 監視・アラート設定
- [ ] 自動バックアップ（日次）
- [ ] Blue-Green デプロイ

## テスト戦略

### 単体テスト
- [ ] 時間枠管理ロジック
- [ ] 決済フロー
- [ ] 在庫管理
- [ ] バリデーション

### 統合テスト
- [ ] 注文〜決済〜確定フロー
- [ ] POS連携
- [ ] メール通知

### E2Eテスト
- [ ] ユーザー注文フロー
- [ ] 管理者操作フロー
- [ ] 決済エラーハンドリング

## 運用・保守計画

### 監視項目
- [ ] API応答時間（P95 < 500ms）
- [ ] エラー率（< 0.1%）
- [ ] 決済成功率（> 99%）
- [ ] 時間枠稼働率

### ログ・監査
- [ ] 決済ログ（90日保持）
- [ ] 管理操作ログ
- [ ] エラーログ
- [ ] パフォーマンスログ

### バックアップ・復旧
- [ ] DB自動バックアップ（日次、30日保持）
- [ ] 設定ファイルバックアップ
- [ ] 災害復旧手順書

## 成功指標・KPI

### ビジネス指標
- [ ] 電話注文削減率: 30%以上
- [ ] 再注文率向上: +15%
- [ ] 事務作業時間削減: 20%

### 技術指標
- [ ] 月間SLO: 99.5%
- [ ] API応答時間P95: 500ms以下
- [ ] 決済成功率: 99%以上

### ユーザー体験指標
- [ ] 注文完了時間: 3分以内
- [ ] ページ読み込み時間: 2秒以内
- [ ] モバイル最適化スコア: 90以上

## リスク・課題

### 技術リスク
- [ ] 決済ゲートウェイ障害対応
- [ ] POS連携仕様変更対応
- [ ] ピーク時負荷対策

### ビジネスリスク
- [ ] 法規制変更対応
- [ ] 競合サービス対策
- [ ] 店舗運用変更対応

### 対策
- [ ] 複数決済手段の提供
- [ ] 段階的リリース
- [ ] 運用マニュアル整備
- [ ] サポート体制構築

---

## 次のアクション

1. **Phase 1開始**: 時間枠管理システムの実装
2. **決済ゲートウェイ選定**: 要件に合う国内業者の調査・契約
3. **開発環境整備**: テスト環境・CI/CD パイプライン構築
4. **チーム体制**: 開発・テスト・運用体制の確立

このプランに基づいて段階的に実装を進め、各フェーズ完了時にユーザーレビューを実施します。
