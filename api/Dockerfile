FROM python:3.12-slim

WORKDIR /app

RUN pip install poetry

COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.create false && \
    poetry install --only=main --no-root

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "fastapi", "run", "app/main.py", "--host", "0.0.0.0"]
