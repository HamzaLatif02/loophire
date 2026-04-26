# Loophire

Full-stack AI-powered hiring loop platform.

## Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Backend  | Python · FastAPI · SQLAlchemy · Alembic        |
| Database | PostgreSQL                                    |
| Cache    | Redis                                         |
| AI       | Anthropic Claude API                          |
| Frontend | React · Vite · Tailwind CSS · Recharts · Axios |

## Project structure

```
loophire/
├── backend/
│   ├── agents/        # AI agent definitions
│   ├── migrations/    # Alembic migrations
│   ├── models/        # SQLAlchemy ORM models
│   ├── routers/       # FastAPI route handlers
│   ├── schemas/       # Pydantic request/response schemas
│   ├── services/      # Business logic
│   ├── database.py    # DB engine & session
│   ├── redis_client.py
│   ├── main.py
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        ├── hooks/
        ├── pages/
        └── utils/
```

## Getting started

### Prerequisites

- Python 3.11+
- Node 18+
- PostgreSQL
- Redis

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env   # fill in values
alembic upgrade head
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

API is proxied to `http://localhost:8000` in development.

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable            | Description                        |
|---------------------|------------------------------------|
| `DATABASE_URL`      | PostgreSQL connection string        |
| `REDIS_URL`         | Redis connection string             |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key            |
| `TAVILY_API_KEY`    | Tavily search API key               |
