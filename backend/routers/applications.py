import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from agents.fit_agent import analyse_fit
from agents.writer_agent import write_application
from database import get_db
from services.memory_service import get_preferences
from services.pdf_export_service import generate_pdf
from services.research_service import research_company
from models.application import Application, ApplicationStatus
from models.user import User
from schemas.application import (
    ApplicationDetail,
    ApplicationGenerateRequest,
    ApplicationStatusUpdate,
    ApplicationSummary,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _get_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_application(application_id: int, user_id: int, db: Session) -> Application:
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.user_id == user_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("/generate", response_model=ApplicationDetail, status_code=201)
def generate_application(body: ApplicationGenerateRequest, db: Session = Depends(get_db)):
    user = _get_user(body.user_id, db)

    if not user.base_cv_text:
        raise HTTPException(
            status_code=400,
            detail="No CV on file. Upload a CV before generating an application.",
        )

    try:
        fit_analysis = analyse_fit(user.base_cv_text, body.job_description)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Fit analysis failed: {exc}")

    try:
        company_research = research_company(body.company_name)
    except (RuntimeError, ValueError):
        company_research = None

    user_preferences = get_preferences(body.user_id)

    try:
        written = write_application(
            cv_text=user.base_cv_text,
            job_description=body.job_description,
            fit_analysis=fit_analysis,
            company_research=company_research,
            user_preferences=user_preferences or None,
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Document generation failed: {exc}")

    application = Application(
        user_id=user.id,
        job_title=body.job_title,
        company_name=body.company_name,
        job_description=body.job_description,
        fit_score=fit_analysis.get("fit_score"),
        keyword_gaps=fit_analysis.get("keyword_gaps"),
        company_research=company_research,
        tailored_cv=written["tailored_cv"],
        cover_letter=written["cover_letter"],
        status=ApplicationStatus.draft,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@router.get("", response_model=List[ApplicationSummary])
def list_applications(user_id: int, db: Session = Depends(get_db)):
    # No user existence check — returns [] naturally when no records exist,
    # so the frontend receives an empty array instead of a 404.
    return (
        db.query(Application)
        .filter(Application.user_id == user_id)
        .order_by(Application.created_at.desc())
        .all()
    )


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(application_id: int, user_id: int, db: Session = Depends(get_db)):
    _get_user(user_id, db)
    return _get_application(application_id, user_id, db)


@router.patch("/{application_id}/status", response_model=ApplicationDetail)
def update_status(
    application_id: int,
    body: ApplicationStatusUpdate,
    user_id: int,
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    application = _get_application(application_id, user_id, db)
    application.status = body.status
    db.commit()
    db.refresh(application)
    return application


def _safe_filename(text: str) -> str:
    """Strip non-alphanumeric characters so filenames are safe across OS."""
    return re.sub(r"[^\w]+", "_", text).strip("_").lower()


@router.get("/{application_id}/export/cv")
def export_cv(
    application_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    app = _get_application(application_id, user_id, db)
    if not app.tailored_cv:
        raise HTTPException(status_code=404, detail="No tailored CV available for this application.")
    pdf = generate_pdf(f"Tailored CV — {app.job_title} at {app.company_name}", app.tailored_cv)
    filename = f"tailored_cv_{_safe_filename(app.company_name)}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{application_id}/export/cover-letter")
def export_cover_letter(
    application_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    app = _get_application(application_id, user_id, db)
    if not app.cover_letter:
        raise HTTPException(status_code=404, detail="No cover letter available for this application.")
    pdf = generate_pdf(f"Cover Letter — {app.job_title} at {app.company_name}", app.cover_letter)
    filename = f"cover_letter_{_safe_filename(app.company_name)}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
