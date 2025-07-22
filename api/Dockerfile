FROM python:3.12-slim
WORKDIR /app

RUN pip install poetry

# 依存定義をコピー (プロジェクトルート/api 以下から)
COPY api/pyproject.toml api/poetry.lock* ./

RUN poetry config virtualenvs.create false \
    && poetry install --only=main --no-root
# アプリ本体をコピー (プロジェクトルート/api/app → /app/app)
COPY api/app ./app

EXPOSE 8000

CMD ["poetry","run","uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]