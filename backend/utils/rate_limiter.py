from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_client_ip(request: Request) -> str:
    """
    Best-effort real-IP extraction behind Railway's edge proxy.
    Trusts X-Forwarded-For > X-Real-IP > direct client host.
    Falls back to "127.0.0.1" so the counter still accumulates rather
    than returning a new key on every request.
    """
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    xri = request.headers.get("X-Real-IP")
    if xri:
        return xri.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def get_user_id(request: Request) -> str:
    """Rate-limit key: user_id from JWT when authenticated, IP address otherwise."""
    try:
        from utils.auth import decode_token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            user_id = decode_token(token)
            return f"user:{user_id}"
    except Exception:
        pass
    return f"ip:{get_client_ip(request)}"


# Explicit in-memory storage so the URI is never ambiguous
limiter = Limiter(key_func=get_user_id, storage_uri="memory://")

LIMITS = {
    # Auth
    "auth_register":      "10/hour",
    "auth_login":         "5/minute",
    # CV (legacy single-CV endpoints)
    "cv_upload":          "20/hour",
    "cv_list":            "60/minute",
    # Application generation — hits Claude API
    "app_generate":       "10/hour",
    "app_regenerate":     "10/hour",
    "app_list":           "60/minute",
    "app_detail":         "60/minute",
    "app_update":         "30/minute",
    "app_notes":          "60/minute",
    "app_import_ext":     "30/hour",
    "app_export_pdf":     "20/hour",
    "app_interview_prep": "10/hour",
    "app_scrape_job":     "30/hour",
    # Job search
    "job_search":         "30/minute",
    "job_import":         "30/minute",
    # Agent-heavy
    "research":           "20/hour",
}
