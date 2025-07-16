# ベースイメージ
FROM python:3.11-slim

# 作業ディレクトリ
WORKDIR /app

# 依存関係をコピーしてインストール
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体をコピー（api/app 以下だけを /app/app に配置）
COPY api/app ./app

# Fly.toml に合わせたポート
ENV PORT 3000
EXPOSE 3000

# 起動コマンド
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]