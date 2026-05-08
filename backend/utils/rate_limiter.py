from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


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
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_user_id)

LIMITS = {
    # Auth
    "auth_register":      "10/hour",
    "auth_login":         "5/minute",
    # CV (legacy single-CV endpoints)
    "cv_upload":          "20/hour",
    "cv_list":            "60/minute",
    # Application generation — hits Claude API
    "app_generate":       "10/hour",
    "app_list":           "60/minute",
    "app_detail":         "60/minute",
    "app_update":         "30/minute",
    "app_export_pdf":     "20/hour",
    "app_interview_prep": "10/hour",
    "app_scrape_job":     "30/hour",
    # Job search
    "job_search":         "30/minute",
    "job_import":         "30/minute",
    # Agent-heavy
    "research":           "20/hour",
}
