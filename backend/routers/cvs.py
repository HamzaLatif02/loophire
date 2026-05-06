import logging
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.cv_version import CVVersion
from services.cv_parser import parse_pdf_with_links

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cvs", tags=["cvs"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── schemas ───────────────────────────────────────────────────────────────────

class CVVersionOut(BaseModel):
    id: int
    name: str
    is_default: bool
    characters: int
    created_at: str

    class Config:
        from_attributes = True


# ── helpers ───────────────────────────────────────────────────────────────────

def _clear_default(user_id: int, db: Session) -> None:
    db.query(CVVersion).filter(
        CVVersion.user_id == user_id, CVVersion.is_default == True  # noqa: E712
    ).update({"is_default": False})


def _to_out(cv: CVVersion) -> CVVersionOut:
    return CVVersionOut(
        id=cv.id,
        name=cv.name,
        is_default=cv.is_default,
        characters=len(cv.cv_text),
        created_at=cv.created_at.isoformat(),
    )


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CVVersionOut])
def list_cv_versions(user_id: int = Query(...), db: Session = Depends(get_db)):
    versions = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == user_id)
        .order_by(CVVersion.created_at.desc())
        .all()
    )
    return [_to_out(v) for v in versions]


@router.post("/upload", response_model=CVVersionOut, status_code=201)
async def upload_cv_version(
    file: UploadFile = File(...),
    user_id: int = Query(...),
    name: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")

    try:
        parsed = parse_pdf_with_links(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    cv_text = parsed["text"]
    if not cv_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from this PDF.")

    existing_count = db.query(CVVersion).filter(CVVersion.user_id == user_id).count()
    is_first = existing_count == 0

    if is_first:
        _clear_default(user_id, db)

    cv = CVVersion(
        user_id=user_id,
        name=name.strip(),
        cv_text=cv_text,
        is_default=is_first,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    logger.info("Saved CV version id=%d for user_id=%d (%d chars)", cv.id, user_id, len(cv_text))
    return _to_out(cv)


@router.patch("/{cv_id}/set-default", response_model=CVVersionOut)
def set_default_cv(cv_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    cv = db.query(CVVersion).filter(CVVersion.id == cv_id, CVVersion.user_id == user_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV version not found.")
    _clear_default(user_id, db)
    cv.is_default = True
    db.commit()
    db.refresh(cv)
    return _to_out(cv)


@router.delete("/{cv_id}", status_code=204)
def delete_cv_version(cv_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    cv = db.query(CVVersion).filter(CVVersion.id == cv_id, CVVersion.user_id == user_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV version not found.")

    was_default = cv.is_default
    db.delete(cv)
    db.flush()

    if was_default:
        next_cv = (
            db.query(CVVersion)
            .filter(CVVersion.user_id == user_id)
            .order_by(CVVersion.created_at.desc())
            .first()
        )
        if next_cv:
            next_cv.is_default = True

    db.commit()
