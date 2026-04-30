import logging

from fastapi import APIRouter, Depends, HTTPException, File, Query, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.cv import CVUploadResponse, CVResponse
from services.cv_parser import parse_pdf_with_links

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cv"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_or_create_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.info("User %d not found — creating guest row", user_id)
        user = User(email="guest@loophire.app")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile = File(...),
    user_id: int = Query(..., description="ID of the user uploading the CV"),
    db: Session = Depends(get_db),
):
    logger.info("Upload endpoint hit")

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    logger.info("File received: %s, content_type: %s", file.filename, file.content_type)

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

    user = _get_or_create_user(user_id, db)
    user.base_cv_text = cv_text
    user.cv_links = cv_links
    db.commit()
    db.refresh(user)

    logger.info("Saved to database successfully (user_id=%d)", user.id)

    return CVUploadResponse(
        user_id=user.id,
        cv_text=cv_text,
        characters=len(cv_text),
        links=cv_links,
    )


@router.get("", response_model=CVResponse)
def get_cv(
    user_id: int = Query(..., description="ID of the user"),
    db: Session = Depends(get_db),
):
    user = _get_or_create_user(user_id, db)
    return CVResponse(user_id=user.id, cv_text=user.base_cv_text)
