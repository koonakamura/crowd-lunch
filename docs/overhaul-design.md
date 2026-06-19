# Crowd Lunch 大規模改修 設計ドキュメント

作成日: 2026-06-19 / 対象: crowd-lunch（ランチ・モバイルオーダー）/ ステータス: ドラフト（要レビュー）

---

## 0. TL;DR

2025年8月の初版から運用してきたが、ビジネス（週次でほぼ固定の献立＋トッピング／オプション／カフェドリンク）に対して**データ構造が単純すぎる**のが全課題の根。今回は以下4領域を同時に刷新する：

1. **データ構造の刷新** … 「商品マスタ＋オプション＋カテゴリ＋週次テンプレ」へ。注文は当時の価格をスナップショット保存。
2. **管理画面UX** … 週まとめて献立を組む“週次プランニング”、サーバ保存テンプレ、トッピング設定。
3. **お客様UX / LINE** … LIFFでLINE内注文、オプション選択、LINEプッシュ通知で注文状況連携。
4. **インフラ・安定性** … SQLite→マネージドPostgres、デプロイ時マイグレーション、ステージング、シークレット整備。

進め方は**段階移行（Phase 0〜4）**。まず足回りを固め（Phase 0）、データモデルv2（Phase 1）→管理UX（Phase 2）→お客様/LINE（Phase 3）の順。各フェーズ単独でリリース可能な単位に切る。

---

## 1. 現状(as-is)サマリと課題

### 技術スタック
- **フロント**: React 18 + Vite + React Router 7 + TanStack Query + Radix UI + Tailwind（Netlify）
- **バック**: FastAPI + SQLAlchemy 2 + Alembic（Fly.io / 成田）
- **DB**: SQLite（先日 永続ボリューム `/data` 化）
- **認証**: 管理者=JWT(HS256)、お客様=ゲスト（部署＋名前）中心

### 痛点（実運用で確認済み）
| # | 課題 | 根本原因 |
|---|---|---|
| C1 | トッピング・大盛・ソースを「¥◯◯の別メニュー」として登録 | メニューに**オプション概念が無い**（`menus`がフラット） |
| C2 | 週次でほぼ同じ献立を毎日手入力 | **商品マスタ／テンプレ概念が無い**。メニューは日付ごとに使い捨て |
| C3 | カテゴリ（ランチ/カフェ/丼/ドリンク）で整理できない | `categories` 不在 |
| C4 | 過去メニュー履歴が消えやすかった | SQLite単一マシン＋デプロイ毎初期化（→ボリュームで暫定修正済） |
| C5 | 注文状況は5秒ポーリング、WebSocketは未活用 | 通知基盤が無い（LINE未連携） |
| C6 | JSTズレ等、時刻処理が前後で重複・散在 | `time_utils.py`(py)と`timeUtils.ts`(ts)に二重実装、カットオフ18:15がハードコード散在 |
| C7 | スキーマ二重定義(`Menu`/`MenuSQLAlchemy`)、未使用API(`/admin/menus/{id}/items`) | 初版の名残 |
| C8 | `SECRET_KEY`デフォルト値、`/auth/login`がハードコードadmin | 認証が暫定実装 |
| C9 | LINE連携ゼロ（チャットで手動配信→手動オーダー） | 未構築 |

---

## 2. 目標(to-be)アーキテクチャ

```
[お客様] ──LINE/LIFF──┐
[お客様] ──Web(PWA)───┤→ Netlify(フロント) ──API──> FastAPI(Fly.io)
[店舗管理]─管理画面────┘                                  │
                                                          ├─> PostgreSQL(マネージド, 自動バックアップ)
                                                          ├─> LINE Messaging API(プッシュ通知)
                                                          └─> オブジェクトストレージ(画像)
```

**設計原則**
- **商品マスタと日次提供を分離**（再利用・テンプレ・履歴の土台）
- **オプション/モディファイアを第一級**に（トッピング・量・ソース）
- **注文は時点スナップショット保存**（後から価格や名称が変わっても注文履歴は不変）
- **時刻は timestamptz で統一**、提供日(`serve_date`)はDateのまま、業務ルール（営業時間/カットオフ）は設定テーブル化
- **マイグレーションはデプロイ時に自動適用**、`create_all`依存を廃止

---

## 3. 領域別設計

### A. データ構造の刷新（最重要）

#### 新スキーマ（概念図）

```
categories(カテゴリ)
  id, name, kind[lunch|cafe|drink|bowl|other], sort_order, is_active

products(商品マスタ) ── 日付に依存しない再利用可能な商品
  id, category_id, name, description, base_price, image_url, is_active, created_at

option_groups(オプション群)  例: 「ご飯の量」「トッピング」
  id, product_id(またはNULLで共有), name, min_select, max_select, is_required, sort_order

options(オプション)  例: 大盛+¥200 / 半熟卵+¥100 / チーズ+¥200 / はちみつ¥0(無料)
  id, option_group_id, name, price_delta, sort_order, is_active
  ※ price_delta が「+¥200」等の増減金額。無料オプションは 0、割引も負値で表現可

media_assets(画像ライブラリ) ── アップロード画像の保管箱
  id, url, filename, label, kind[hero|product|other], uploaded_at, is_active

day_settings(日次の表示設定) ── 日付ごとの見せ方
  serve_date(PK), hero_image_id(FK→media_assets, NULL可), banner_text, note

daily_menus(日次提供) ── 旧menusの置き換え。商品マスタを参照
  id, serve_date, product_id, price_override(NULL可), max_qty, sort_order,
  available_from, available_to(カフェ時間制御), is_available

menu_templates(テンプレ) ── サーバ保存。曜日デフォルト or 任意名
  id, name, weekday(NULL可), note
template_items
  template_id, product_id, price_override, max_qty, sort_order
  (+ 既定オプションの紐付けも可)

orders(注文)
  id, order_no(unique), serve_date, user_id(NULL可), department, customer_name,
  delivery_type, requested_time, delivery_location, status,
  subtotal, total, note, created_at(tz-aware), delivered_at

order_items(明細) ── スナップショット保持
  id, order_id, product_id, daily_menu_id,
  name_snapshot, unit_price_snapshot, qty, line_total

order_item_options(明細オプション) ── スナップショット保持
  id, order_item_id, option_id, name_snapshot, price_delta_snapshot

business_rules / settings(設定)
  営業時間、ランチ時間、カフェ時間、当日カットオフ等を一元管理（ハードコード18:15を排除）
```

#### オプションの価格について（明示）
「大盛」「◯◯トッピング」「ソース」など**それ自体に金額が必要なもの**は、オプションが価格(`price_delta`)を持つ前提で設計している。
- 例：シンガポールチキンライス（base ¥900）＋「ご飯大盛 +¥100」＋「半熟ゆでたまご +¥100」＝ ¥1,100
- 例：ゲンキカレー（base ¥1,000）＋「チーズ +¥200」、「はちみつ +¥0（無料）」
- `min_select`/`max_select`/`is_required` で「1つ必須」「複数可」「任意」を制御
- 注文時に `unit_price_snapshot`（商品）と `price_delta_snapshot`（各オプション）を保存 → 後で価格改定しても**過去注文の金額は不変**

#### 旧→新 データ移行マッピング
- 旧`menus`（フラット）→ `products`（名寄せでマスタ化）＋`daily_menus`（提供日リンク）
- 「大盛」「◯◯トッピング」「ソース」等の別メニュー行 → `option_groups`/`options` へ昇格（半自動：名称ルールで候補抽出→人手で確認）。**＋¥◯◯の金額はそのまま `price_delta` へ**
- 旧`orders`/`order_items` → 新テーブルへ。価格は当時値を `*_snapshot` に充填
- 既に復元済みの履歴（6/19、9/15〜9/19）も同ロジックで移行

#### 画像（日次の表示画像）の扱い ★今回追加
現状はメニューの`img_url`を使い回し、「最初の画像を背景に流用」する曖昧な仕組みで、日ごとの画像設定がやりにくい。改修後は**画像ライブラリ＋日次選択**に分離する：

- **画像ライブラリ（保管箱）** = `media_assets`：管理画面からアップロードした画像をすべて貯めておく。一覧・ラベル付け・再利用が可能。
- **日次の表示画像の選択** = `day_settings.hero_image_id`：各提供日について、ライブラリから「その日お客様画面に出す画像」を選ぶだけ。アップロードと「どの日に出すか」を分離。
- **実体の保存先はオブジェクトストレージ**（ローカルディスク`/uploads`を廃止 → デプロイやマシン入れ替えで画像が消える問題も解消）。
- 商品ごとの画像（`products.image_url`）とは別管理。日次のヒーロー画像は「今日の一押し」的な見せ方に使える。

---

### B. 管理画面UX

| 機能 | 現状 | 改修後 |
|---|---|---|
| 献立作成 | 日付ごとに毎回手入力 | **週次プランニング**：週を選び月〜金を一覧、商品マスタからドラッグで配置、数量/価格上書き |
| テンプレ | localStorage（端末内・暫定） | **サーバ保存テンプレ**＋**曜日デフォルト**（「金曜はこの構成」を自動提案） |
| トッピング | ¥◯◯の別メニュー | **オプション設定UI**（商品にオプション群を付与、必須/選択数を設定） |
| 並び順 | localStorage暫定 | `sort_order`をサーバ保存、ドラッグ＆ドロップ |
| カテゴリ | 無し | カテゴリ別グルーピング表示 |
| 画像 | メニューの`img_url`を流用、設定が曖昧 | **画像ライブラリにアップロード→貯める→日付ごとに表示画像を選択**。保存はオブジェクトストレージ |
| 注文管理 | 一覧/CSV/配達トグル | 強化（フィルタ、リアルタイム反映、集計・売上レポート） |
| 認証 | 暫定JWT | 正式OAuth（Google等）＋ロール管理、`SECRET_KEY`必須化 |

---

### C. お客様UX / LINE連携

- **LIFF（LINE Front-end Framework）**：LINE内でそのまま注文。LINEプロフィールでお客様を識別（毎回の部署/名前入力を軽減、リピート時はプリフィル）
- **オプション選択UI**：トッピング・量などをカートで選択、小計をリアルタイム表示
- **LINEプッシュ通知**（Messaging API）：受付／調理中／受け取り可／配達完了 を通知 → **5秒ポーリングを置換**
- **モバイルファースト再設計**：週メニュー閲覧→カート→オプション→確定の動線を整理
- **日次のヒーロー画像表示**：管理画面でその日に選んだ画像（`day_settings.hero_image_id`）を、お客様画面のトップに表示。日替わりの見栄えを簡単に切替
- **配信の自動化**：現在チャットへ手動で貼っている週メニューを、登録データ＋当日の画像から自動生成・配信

> 前提確認：LINE公式アカウント／Messaging APIチャネル／LIFFの開設状況（後述 §7）。

---

### D. インフラ・安定性

| 項目 | 現状 | 改修後 |
|---|---|---|
| DB | SQLite単一マシン | **マネージドPostgres**（Fly Postgres / Supabase / Neon いずれか）＋自動バックアップ |
| 画像 | ローカルディスク`/uploads`（消失リスク） | **オブジェクトストレージ**（Cloudflare R2 / S3互換 / Supabase Storage）。CDN配信・永続 |
| マイグレーション | `create_all`頼み | **Alembicをデプロイ時自動適用**（fly `release_command`）、複数ヘッド整理 |
| 環境 | 本番のみ | **ステージング**（別app＋別DB）でリリース前検証 |
| シークレット | デフォルト値残存 | `SECRET_KEY`/LINEキー等を fly secrets 化、デフォルト排除 |
| CI/CD | push→即デプロイ（テスト未連結） | テスト/型チェックをゲートに、ステージング→本番の昇格フロー |
| 監視 | 構造化ログのみ | エラートラッキング(Sentry等)＋ヘルスチェック＋アラート |
| 時刻 | py/ts二重実装 | サーバを真実源に、業務ルールは設定テーブル、フロントは表示専用 |
| 事故防止 | ボリュームで暫定 | Postgres移行で根本解消（rootfs消失リスクと無縁に） |

---

## 4. フェーズ計画（ロードマップ）

各フェーズは**単独でリリース可能**。前フェーズの成果に積み上げる。

- **Phase 0：足回り安定化（基盤）**
  Postgres移行 / Alembicデプロイ時適用 / ステージング / シークレット整備 / 時刻処理の整理。
  → 以降の改修を安全に回せる土台。ユーザー影響は最小。

- **Phase 1：データモデルv2**
  商品マスタ＋オプション＋カテゴリ＋日次提供＋テンプレ。旧データ移行。API後方互換を維持しつつ新エンドポイント追加。

- **Phase 2：管理画面UX**
  週次プランニング、サーバ保存テンプレ、オプション設定、ドラッグ並べ替え、注文管理強化。

- **Phase 3：お客様UX＋LINE**
  LIFF、オプション選択、LINEプッシュ通知、メニュー自動配信、モバイル再設計。

- **Phase 4：仕上げ**
  旧経路の撤去、レポート/分析、監視強化、ドキュメント整備。

> 優先度の目安：**Phase 0 と 1 は必須の土台**。見た目のインパクトが大きいのは 2・3。LINEは前提整備（§7）次第で前後し得る。

---

## 5. リスクと対策
- **データ移行の正確性** → ステージングで本番コピーに対しドライラン、件数・金額の突合、ロールバック手順を用意。
- **オプション昇格の判定** → 自動抽出＋人手確認のハイブリッド。誤分類してもマスタ編集で容易に修正可能な設計。
- **LINE導入の外部依存** → 公式アカウント/チャネル/審査の所要を先に確認（§7）。未確定なら Phase 3 を後ろ倒し。
- **スコープ膨張** → フェーズ単位で締め、各フェーズに受け入れ基準を定義。
- **ダウンタイム** → Postgres移行は読み取り専用→切替の段取り。営業時間外に実施。

---

## 6. 影響範囲（主な改修対象）
- バック: `models.py`（全面）, `crud.py`, `main.py`(API再編), `alembic/`(新マイグレーション), `auth.py`(正式化), 新規 LINE webhook/通知モジュール
- フロント: `pages/AdminPage.tsx`（週次プランニング/オプション）, `pages/HomePage|OrderPage|ConfirmPage.tsx`（オプション/LIFF）, `lib/api.ts`, 時刻ユーティリティ整理
- インフラ: `fly.toml`(release_command, Postgres), `.github/workflows/`(テストゲート/ステージング), secrets

---

## 7. 要確認・未決事項（次の意思決定）
1. **Postgresのホスティング**：Fly Postgres / Supabase / Neon のどれにするか（コスト・運用性）。
2. **LINEの現状**：公式アカウント・Messaging APIチャネル・LIFFは既にあるか？（チャットにLINE誘導があるので公式アカウントは存在しそう）
3. **お客様の識別方針**：ゲスト（部署＋名前）を維持か、LINEログインで個人を識別するか。
4. **管理者認証**：Google Workspaceアカウントで統一して良いか。権限ロールは何種類か。
5. **画像ストレージ**：Cloudflare R2 / S3互換 / Supabase Storage のどれにするか（Postgresの選択と揃えると楽）。
6. **対象範囲**：将来的に複数店舗・複数拠点への展開はあるか（データモデルに影響）。
7. **体制・時間軸**：開発はこの体制で進めるか、リリース希望時期はあるか。

---

## 8. 次アクション（提案）
- 本ドキュメントをレビュー → §7 を確定
- 確定後、**Phase 0 の詳細設計＆着手**（Postgres移行が全ての前提）
- 並行して、現行で困っている具体例（献立入力の手間・トッピング運用）をもう数例もらえると、データモデルの妥当性検証に有用
