import asyncio
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth_dependency import get_current_user
from dependencies.demo_guard import require_non_demo
from models.cv_version import CVVersion
from models.user import User
from services.cv_parser import parse_pdf_with_links
from services.cv_templates import TEMPLATES, detect_template
from services.latex_export_service import generate_cv_pdf
from utils.rate_limiter import LIMITS, limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cvs", tags=["cvs"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ── schemas ───────────────────────────────────────────────────────────────────

class CVVersionOut(BaseModel):
    id: int
    name: str
    is_default: bool
    characters: int
    cv_text: str
    word_count: int
    template_id: str
    created_at: str

    class Config:
        from_attributes = True


# ── helpers ───────────────────────────────────────────────────────────────────

def _clear_default(user_id: int, db: Session) -> None:
    db.query(CVVersion).filter(
        CVVersion.user_id == user_id, CVVersion.is_default == True  # noqa: E712
    ).update({"is_default": False})


def _to_out(cv: CVVersion) -> CVVersionOut:
    text = cv.cv_text or ""
    return CVVersionOut(
        id=cv.id,
        name=cv.name,
        is_default=cv.is_default,
        characters=len(text),
        cv_text=text,
        word_count=len(text.split()),
        template_id=cv.template_id or "classic",
        created_at=cv.created_at.isoformat(),
    )


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CVVersionOut])
@limiter.limit(LIMITS["cv_list"])
def list_cv_versions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    versions = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == current_user.id)
        .order_by(CVVersion.created_at.desc())
        .all()
    )
    return [_to_out(v) for v in versions]


@router.get("/templates")
@limiter.limit(LIMITS["cv_list"])
def list_templates(request: Request):
    return [
        {
            "id":          t["id"],
            "name":        t["name"],
            "description": t["description"],
            "preview":     t["preview"],
        }
        for t in TEMPLATES.values()
    ]


@router.post("/upload", status_code=201)
@limiter.limit(LIMITS["cv_upload"])
async def upload_cv_version(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    template_id: str = Form(default="auto"),
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="File must have a .pdf extension.")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File size must be under 5 MB.")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="The uploaded file does not appear to be a valid PDF.")

    try:
        parsed = parse_pdf_with_links(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    cv_text = parsed["text"]
    if not cv_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from this PDF.")

    valid_templates = list(TEMPLATES.keys()) + ["auto"]
    if template_id not in valid_templates:
        template_id = "auto"

    resolved_template = detect_template(cv_text) if template_id == "auto" else template_id
    auto_detected = template_id == "auto"

    existing_count = db.query(CVVersion).filter(CVVersion.user_id == current_user.id).count()
    is_first = existing_count == 0

    if is_first:
        _clear_default(current_user.id, db)

    cv = CVVersion(
        user_id=current_user.id,
        name=name.strip(),
        cv_text=cv_text,
        is_default=is_first,
        template_id=resolved_template,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    logger.info(
        "Saved CV version id=%d for user_id=%d (%d chars, template=%s)",
        cv.id, current_user.id, len(cv_text), resolved_template,
    )
    return {
        **_to_out(cv).model_dump(),
        "template_name": TEMPLATES[resolved_template]["name"],
        "auto_detected": auto_detected,
    }


@router.patch("/{cv_id}/set-default", response_model=CVVersionOut)
@limiter.limit(LIMITS["cv_list"])
def set_default_cv(
    request: Request,
    cv_id: int,
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    cv = db.query(CVVersion).filter(CVVersion.id == cv_id, CVVersion.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV version not found.")
    _clear_default(current_user.id, db)
    cv.is_default = True
    db.commit()
    db.refresh(cv)
    return _to_out(cv)


@router.patch("/{cv_id}/template")
@limiter.limit(LIMITS["cv_list"])
def update_cv_template(
    request: Request,
    cv_id: int,
    template_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_templates = list(TEMPLATES.keys()) + ["auto"]
    if template_id not in valid_templates:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid template. Choose from: {', '.join(valid_templates)}",
        )
    cv = db.query(CVVersion).filter(
        CVVersion.id == cv_id, CVVersion.user_id == current_user.id
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV version not found.")

    resolved = detect_template(cv.cv_text or "") if template_id == "auto" else template_id
    cv.template_id = resolved
    db.commit()
    return {"id": cv_id, "template_id": resolved}


def _structure_cv_sync(cv_text: str) -> dict:
    """Call Claude Haiku to parse raw CV text into structured JSON for LaTeX rendering."""
    import anthropic

    client = anthropic.Anthropic()
    prompt = (
        "Parse this CV text into structured JSON.\n"
        "Return ONLY valid JSON — no markdown fences, no prose.\n\n"
        "Required format:\n"
        '{"profile":"...","technical_skills":[{"category":"...","items":"..."}],'
        '"education":[{"institution":"...","degree":"...","dates":"...","highlights":["..."]}],'
        '"experience":[{"title":"...","company":"...","dates":"...","highlights":["..."]}],'
        '"projects":[{"name":"...","github_url":"","highlights":["..."]}]}\n\n'
        f"CV text:\n{cv_text[:8000]}"
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        parts = raw.split("```", 2)
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "profile": cv_text[:500],
            "technical_skills": [],
            "education": [],
            "experience": [],
            "projects": [],
        }


async def _get_cv_content(cv: CVVersion, db: Session) -> dict:
    """Return cv_json if cached, otherwise structure the raw text and cache it."""
    if cv.cv_json:
        return cv.cv_json
    content = await asyncio.to_thread(_structure_cv_sync, cv.cv_text or "")
    cv.cv_json = content
    db.commit()
    return content


@router.get("/{cv_id}/preview-pdf")
@limiter.limit(LIMITS["app_export_pdf"])
async def preview_cv_pdf(
    request: Request,
    cv_id: int,
    template_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a PDF and stream it inline (for browser preview)."""
    cv = db.query(CVVersion).filter(
        CVVersion.id == cv_id, CVVersion.user_id == current_user.id
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found.")

    effective_template = template_id or cv.template_id or "classic"
    content = await _get_cv_content(cv, db)

    try:
        pdf_bytes = await asyncio.to_thread(generate_cv_pdf, content, effective_template)
    except Exception as exc:
        logger.error("PDF preview failed for cv %d: %s", cv_id, exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="PDF preview failed. The CV text may not be compatible with the selected template.",
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{cv.name}.pdf"',
            "Cache-Control": "no-cache",
        },
    )


@router.get("/{cv_id}/download-pdf")
@limiter.limit(LIMITS["app_export_pdf"])
async def download_cv_pdf(
    request: Request,
    cv_id: int,
    template_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a PDF and force a file download."""
    cv = db.query(CVVersion).filter(
        CVVersion.id == cv_id, CVVersion.user_id == current_user.id
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found.")

    effective_template = template_id or cv.template_id or "classic"
    content = await _get_cv_content(cv, db)

    try:
        pdf_bytes = await asyncio.to_thread(generate_cv_pdf, content, effective_template)
    except Exception as exc:
        logger.error("PDF download failed for cv %d: %s", cv_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="PDF generation failed.")

    safe_name = cv.name.replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_{effective_template}.pdf"',
        },
    )


@router.delete("/{cv_id}", status_code=204)
@limiter.limit(LIMITS["cv_list"])
def delete_cv_version(
    request: Request,
    cv_id: int,
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    cv = db.query(CVVersion).filter(CVVersion.id == cv_id, CVVersion.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV version not found.")

    was_default = cv.is_default
    db.delete(cv)
    db.flush()

    if was_default:
        next_cv = (
            db.query(CVVersion)
            .filter(CVVersion.user_id == current_user.id)
            .order_by(CVVersion.created_at.desc())
            .first()
        )
        if next_cv:
            next_cv.is_default = True

    db.commit()
