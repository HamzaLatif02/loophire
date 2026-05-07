import logging

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth_dependency import get_current_user
from models.user import User
from schemas.cv import CVUploadResponse, CVResponse
from services.cv_parser import parse_pdf_with_links

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cv"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Upload endpoint hit for user_id=%d", current_user.id)

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw = await file.read()
    logger.info("File read into memory: %d bytes", len(raw))

    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")

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
def get_cv(
    current_user: User = Depends(get_current_user),
):
    return CVResponse(user_id=current_user.id, cv_text=current_user.base_cv_text)


@router.get("/debug-links")
def debug_links(current_user: User = Depends(get_current_user)):
    return {"user_id": current_user.id, "cv_links": current_user.cv_links or []}
