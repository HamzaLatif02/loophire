import logging

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth_dependency import get_current_user
from dependencies.demo_guard import require_non_demo
from models.user import User
from schemas.cv import CVResponse, CVUploadResponse
from services.cv_parser import parse_pdf_with_links
from utils.rate_limiter import LIMITS, limiter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cv"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload", response_model=CVUploadResponse)
@limiter.limit(LIMITS["cv_upload"])
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    logger.info("Upload endpoint hit for user_id=%d", current_user.id)

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="File must have a .pdf extension.")

    raw = await file.read()
    logger.info("File read into memory: %d bytes", len(raw))

    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File size must be under 5 MB.")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="The uploaded file does not appear to be a valid PDF.")

    try:
        parsed = parse_pdf_with_links(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    cv_text = parsed["text"]
    cv_links = parsed["links"]
    logger.info("PDF parsed: %d chars, %d links", len(cv_text), len(cv_links))

    current_user.base_cv_text = cv_text
    current_user.cv_links = cv_links
    db.commit()
    db.refresh(current_user)

    logger.info("Saved CV to database for user_id=%d", current_user.id)

    return CVUploadResponse(
        user_id=current_user.id,
        cv_text=cv_text,
        characters=len(cv_text),
        links=cv_links,
    )


@router.get("", response_model=CVResponse)
@limiter.limit(LIMITS["cv_list"])
def get_cv(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return CVResponse(user_id=current_user.id, cv_text=current_user.base_cv_text)


@router.get("/debug-links")
@limiter.limit(LIMITS["cv_list"])
def debug_links(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return {"user_id": current_user.id, "cv_links": current_user.cv_links or []}
