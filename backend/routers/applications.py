from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from agents.fit_agent import analyse_fit
from agents.writer_agent import write_application
from database import get_db
from services.memory_service import get_preferences
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
    _get_user(user_id, db)
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
