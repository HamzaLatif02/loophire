import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import SessionLocal
from models.user import User
from routers import applications as applications_router
from routers import cv as cv_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

app = FastAPI(title="Loophire API")

# ── CORS (must be registered before any routes) ───────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://loophire.xyz",
        "https://www.loophire.xyz",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok"}

app.include_router(cv_router.router, prefix="/api/cv")
app.include_router(applications_router.router)


# ── startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup_check() -> None:
    _log = logging.getLogger("loophire.main")

    # Log which required env vars are present (values never printed)
    required = ["DATABASE_URL", "ANTHROPIC_API_KEY", "TAVILY_API_KEY"]
    optional = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]
    import os
    for var in required:
        if os.getenv(var):
            _log.info("env %s: SET", var)
        else:
            _log.error("env %s: MISSING — this will cause failures", var)
    for var in optional:
        _log.info("env %s: %s", var, "SET" if os.getenv(var) else "not set (Redis disabled)")

    # Seed a guest user (id=1) on first boot — auth not yet implemented
    db = SessionLocal()
    try:
        if not db.query(User).first():
            db.add(User(email="guest@loophire.app"))
            db.commit()
            _log.info("Seeded default guest user (id=1)")
        else:
            _log.info("Guest user already exists — skipping seed")
    except Exception:
        db.rollback()
        _log.exception("Failed to seed guest user")
    finally:
        db.close()


# ── exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Collapse Pydantic errors into a single readable message
    messages = []
    for err in exc.errors():
        loc = " → ".join(str(l) for l in err["loc"] if l != "body")
        messages.append(f"{loc}: {err['msg']}" if loc else err["msg"])
    detail = "; ".join(messages)
    return JSONResponse(
        status_code=422,
        content={"error": detail, "status_code": 422},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger = logging.getLogger("loophire.main")
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred.", "status_code": 500},
    )


# ── health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}
