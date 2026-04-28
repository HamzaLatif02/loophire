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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv_router.router, prefix="/api/cv")
app.include_router(applications_router.router)


# ── startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def seed_guest_user() -> None:
    """Create a default guest user (id=1) on first boot.

    Auth is not yet implemented; all frontend calls use user_id=1. This
    ensures that row exists so CV upload and application generation work
    out of the box on a fresh database.
    """
    logger = logging.getLogger("loophire.main")
    db = SessionLocal()
    try:
        if not db.query(User).first():
            db.add(User(email="guest@loophire.app"))
            db.commit()
            logger.info("Seeded default guest user (id=1)")
    except Exception:
        db.rollback()
        logger.exception("Failed to seed guest user")
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
