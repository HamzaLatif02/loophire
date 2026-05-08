import re

import bleach
import validators
from fastapi import HTTPException

LIMITS = {
    "email":           254,
    "password":        72,
    "job_title":       200,
    "company_name":    200,
    "job_description": 50000,
    "cv_text":         100000,
    "cv_name":         100,
    "cover_letter":    20000,
    "notes":           5000,
    "search_keywords": 200,
    "search_location": 200,
    "url":             2000,
    "general_text":    10000,
}

_INJECTION_PATTERNS = [
    r"ignore (all )?(previous|above|prior) instructions",
    r"you are now",
    r"new instruction",
    r"system prompt",
    r"forget (everything|all|your instructions)",
    r"act as (a |an )?(different|new|another)",
    r"jailbreak",
    r"<\|.*?\|>",
    r"\[\[.*?\]\]",
    r"###\s*instruction",
]

_COMMON_PASSWORDS = {"password", "12345678", "password1", "qwerty123", "loophire1"}


def strip_html(text: str) -> str:
    return bleach.clean(text, tags=[], strip=True)


def sanitise_text(text: str, field: str = "general_text") -> str:
    if not text:
        return text
    cleaned = strip_html(text)
    cleaned = re.sub(r'\n{4,}', '\n\n\n', cleaned)
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    cleaned = cleaned.strip()
    max_len = LIMITS.get(field, LIMITS["general_text"])
    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=422,
            detail=f"Field '{field}' exceeds maximum length of {max_len:,} characters.",
        )
    return cleaned


def sanitise_url(url: str) -> str:
    url = url.strip()
    if len(url) > LIMITS["url"]:
        raise HTTPException(status_code=422, detail="URL is too long.")
    if not validators.url(url):
        raise HTTPException(
            status_code=422,
            detail="Invalid URL format. Please provide a valid https:// URL.",
        )
    if not url.startswith("https://"):
        raise HTTPException(status_code=422, detail="Only HTTPS URLs are accepted.")
    _SSRF_BLOCKED = [
        "localhost", "127.0.0.1", "0.0.0.0", "169.254.",
        "10.", "192.168.", "172.16.", "metadata.google", "169.254.169.254",
    ]
    for pattern in _SSRF_BLOCKED:
        if pattern in url:
            raise HTTPException(status_code=422, detail="This URL is not accessible.")
    return url


def sanitise_email(email: str) -> str:
    email = email.strip().lower()
    if len(email) > LIMITS["email"]:
        raise HTTPException(status_code=422, detail="Email address is too long.")
    if not validators.email(email):
        raise HTTPException(status_code=422, detail="Invalid email address format.")
    return email


def check_prompt_injection(text: str, field: str) -> str:
    lower = text.lower()
    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, lower):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"The {field} field contains content that cannot be processed. "
                    "Please check your input and try again."
                ),
            )
    return text
