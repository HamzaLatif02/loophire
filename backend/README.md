# Loophire — Backend

FastAPI backend for the Loophire AI job application agent.

## Stack

Python 3.11 · FastAPI · PostgreSQL · SQLAlchemy ·
Alembic · Redis · Anthropic Claude · Tavily · pdflatex

## Quick start

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

Docs: http://localhost:8000/docs

## Key files

- `main.py` — App entry point, middleware registration
- `agents/` — AI pipeline agents (fit, writer, tone, interview)
- `services/cv_templates.py` — 4 LaTeX templates + auto-detector
- `utils/progress.py` — WebSocket connection manager
- `tests/e2e_test.py` — Full automated test suite
