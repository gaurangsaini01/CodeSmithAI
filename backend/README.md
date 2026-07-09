# Backend

This backend is managed with `uv` and uses the Python version selected by
pyenv in `.python-version`.

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Do not install dependencies with `pip install -r requirements.txt`; the project
uses `pyproject.toml` and `uv.lock` as the dependency source of truth.
