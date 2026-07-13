FROM python:3.13.14-bookworm

WORKDIR /backend

RUN pip install uv

COPY pyproject.toml uv.lock ./

RUN uv sync --no-dev

COPY . .

CMD ["uv","run","uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--reload"]

EXPOSE 8000