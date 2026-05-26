import asyncio
import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from routers import applications as applications_router
from routers import cv as cv_router
from routers import cvs as cvs_router
from routers import jobs as jobs_router
from routers import ws as ws_router
from routers import usage as usage_router
from routers.auth import router as auth_router
from utils.rate_limiter import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

app = FastAPI(title="Loophire API")

# ── bot blocker ───────────────────────────────────────────────────────────────
# Reject requests for paths that only scanners and bots hit.

_BOT_PATH_FRAGMENTS = (
    ".php", "wp-login", "wp-admin", "xmlrpc",
    "phpmyadmin", ".env", "phpinfo", "shell",
    "actuator", ".git/", "cgi-bin",
)

class BotBlockerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path.lower()
        if any(frag in path for frag in _BOT_PATH_FRAGMENTS):
            return JSONResponse(
                status_code=403,
                content={"error": "Forbidden", "status_code": 403},
            )
        return await call_next(request)

app.add_middleware(BotBlockerMiddleware)

# ── security headers ──────────────────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── rate limiter ──────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    allow_headers=["*", "Authorization"],
)

# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(cv_router.router, prefix="/api/cv")
app.include_router(cvs_router.router)
app.include_router(applications_router.router)
app.include_router(jobs_router.router)
app.include_router(ws_router.router)
app.include_router(usage_router.router)


# ── startup ───────────────────────────────────────────────────────────────────

_scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup_check() -> None:
    _log = logging.getLogger("loophire.main")

    required = ["DATABASE_URL", "ANTHROPIC_API_KEY", "TAVILY_API_KEY", "SECRET_KEY"]
    optional = [
        "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
        "REED_API_KEY", "ADZUNA_APP_ID", "ADZUNA_APP_KEY",
    ]
    for var in required:
        if os.getenv(var):
            _log.info("env %s: SET", var)
        else:
            _log.error("env %s: MISSING — this will cause failures", var)
    for var in optional:
        _log.info("env %s: %s", var, "SET" if os.getenv(var) else "not set")

    # Seed demo account on startup, then reset every 24 hours
    try:
        from scripts.seed_demo import seed_demo
        await asyncio.to_thread(seed_demo)
    except Exception:
        _log.warning("Demo seed on startup failed — demo login will be unavailable", exc_info=True)

    def _reset_demo() -> None:
        try:
            from scripts.seed_demo import seed_demo as _seed
            _seed()
        except Exception:
            logging.getLogger("loophire.demo").exception("Scheduled demo reset failed")

    _scheduler.add_job(_reset_demo, "interval", hours=24, id="demo_reset", replace_existing=True)
    _scheduler.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    _scheduler.shutdown(wait=False)


# ── exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " → ".join(str(loc) for loc in err["loc"] if loc != "body")
        message = err["msg"].replace("Value error, ", "")
        errors.append({"field": field, "message": message})
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed", "errors": errors},
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
    return {"status": "ok", "version": "qa-2026-05-26"}


@app.get("/api/debug/pdf-test")
def debug_pdf_test():
    """Temporary debug endpoint — tests reportlab CV PDF generation."""
    try:
        from services.pdf_export_service import generate_cv_pdf_reportlab
        data = {
            "profile": "Test profile paragraph.",
            "technical_skills": [{"category": "Languages", "items": "Python, TypeScript"}],
            "education": [{"institution": "UCL", "degree": "BSc CS", "dates": "2020-2024", "highlights": ["First class"]}],
            "experience": [{"title": "SWE", "company": "Acme", "dates": "2024-now", "highlights": ["Built APIs"]}],
            "projects": [{"name": "Loophire", "github_url": "https://github.com/HamzaLatif02/loophire", "live_url": "", "highlights": ["AI tool"]}],
        }
        pdf = generate_cv_pdf_reportlab(data)
        return {"ok": True, "size": len(pdf), "valid": pdf[:4] == b"%PDF"}
    except Exception as exc:
        import traceback
        return {"ok": False, "error": str(exc), "traceback": traceback.format_exc()}


@app.get("/api/debug/export-cv/{app_id}")
def debug_export_cv(app_id: int, request: Request):
    """Temporary debug export — returns error details instead of raw PDF."""
    import traceback
    from database import get_db
    from dependencies.auth_dependency import get_current_user
    from models.application import Application
    from services.latex_export_service import generate_cv_pdf
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return {"error": "no token"}
    token = auth_header[7:]
    try:
        from jose import jwt
        import os
        payload = jwt.decode(token, os.getenv("SECRET_KEY", ""), algorithms=["HS256"])
        user_id = payload.get("sub")
    except Exception as e:
        return {"error": f"token decode: {e}"}
    db = next(get_db())
    try:
        app = db.query(Application).filter(Application.id == app_id, Application.user_id == int(user_id)).first()
        if not app:
            return {"error": "not found"}
        tcj = app.tailored_cv_json
        if not tcj:
            return {"error": "no tailored_cv_json"}
        try:
            pdf = generate_cv_pdf(tcj, template_id="classic")
            return {"ok": True, "size": len(pdf), "valid": pdf[:4] == b"%PDF"}
        except Exception as exc:
            return {"ok": False, "error": str(exc), "traceback": traceback.format_exc()}
    finally:
        db.close()
