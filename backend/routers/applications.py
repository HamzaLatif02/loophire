import logging
import re
from collections import Counter
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from agents.fit_agent import analyse_fit
from agents.interview_agent import generate_interview_prep
from agents.writer_agent import write_application
from database import get_db
from services.latex_export_service import generate_cv_pdf
from services.memory_service import get_preferences
from services.pdf_export_service import generate_pdf
from services.research_service import research_company
from models.application import Application, ApplicationStatus
from models.user import User

logger = logging.getLogger(__name__)
from schemas.application import (
    AnalyticsResponse,
    ApplicationDetail,
    ApplicationGenerateRequest,
    ApplicationPatchRequest,
    ApplicationStatusUpdate,
    ApplicationSummary,
    InterviewUpdateRequest,
    ResponseUpdateRequest,
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
            cv_links=user.cv_links or [],
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
        tailored_cv_json=written["tailored_cv_json"],
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


@router.get("/upcoming-interviews", response_model=List[ApplicationSummary])
def get_upcoming_interviews(user_id: int = Query(...), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    return (
        db.query(Application)
        .filter(
            Application.user_id == user_id,
            Application.interview_date.isnot(None),
            Application.interview_date > now,
        )
        .order_by(Application.interview_date.asc())
        .all()
    )


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(user_id: int = Query(...), db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.user_id == user_id).all()
    total = len(apps)
    if total == 0:
        return AnalyticsResponse(
            total_applications=0,
            response_rate=0.0,
            avg_fit_score_with_response=None,
            avg_fit_score_without_response=None,
            response_by_type={},
            top_keywords_in_successful_apps=[],
        )

    responded = [a for a in apps if a.got_response]
    response_rate = round(len(responded) / total * 100, 1)

    def _avg_fit(subset):
        scored = [a.fit_score for a in subset if a.fit_score is not None]
        return round(sum(scored) / len(scored), 1) if scored else None

    avg_with = _avg_fit(responded)
    avg_without = _avg_fit([a for a in apps if not a.got_response])

    type_counts: Counter = Counter()
    for a in responded:
        if a.response_type:
            type_counts[a.response_type] += 1

    keyword_counter: Counter = Counter()
    for a in responded:
        gaps = a.keyword_gaps or []
        for kw in gaps:
            if isinstance(kw, str):
                keyword_counter[kw.lower()] += 1
            elif isinstance(kw, dict):
                word = kw.get("keyword") or kw.get("word") or kw.get("term")
                if word:
                    keyword_counter[str(word).lower()] += 1
    top_keywords = [kw for kw, _ in keyword_counter.most_common(10)]

    return AnalyticsResponse(
        total_applications=total,
        response_rate=response_rate,
        avg_fit_score_with_response=avg_with,
        avg_fit_score_without_response=avg_without,
        response_by_type=dict(type_counts),
        top_keywords_in_successful_apps=top_keywords,
    )


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(application_id: int, user_id: int, db: Session = Depends(get_db)):
    _get_user(user_id, db)
    return _get_application(application_id, user_id, db)


def _flatten_cv_json(cv_json: dict) -> str:
    lines = []
    lines.append(cv_json.get("profile", ""))
    for skill in cv_json.get("technical_skills", []):
        lines.append(f"{skill['category']}: {skill['items']}")
    for exp in cv_json.get("experience", []):
        lines.append(f"{exp['title']} at {exp['company']} ({exp['dates']})")
        for h in exp.get("highlights", []):
            lines.append(f"  - {h}")
    for proj in cv_json.get("projects", []):
        lines.append(proj["name"])
        for h in proj.get("highlights", []):
            lines.append(f"  - {h}")
    return "\n".join(lines)


@router.patch("/{application_id}", response_model=ApplicationDetail)
def patch_application(
    application_id: int,
    body: ApplicationPatchRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    application = _get_application(application_id, user_id, db)
    if body.tailored_cv_json is not None:
        application.tailored_cv_json = body.tailored_cv_json
        application.tailored_cv = _flatten_cv_json(body.tailored_cv_json)
    if body.cover_letter is not None:
        application.cover_letter = body.cover_letter
    db.commit()
    db.refresh(application)
    return application


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


@router.patch("/{application_id}/interview", response_model=ApplicationDetail)
def update_interview(
    application_id: int,
    body: InterviewUpdateRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    application = _get_application(application_id, user_id, db)
    if body.interview_date is not None:
        application.interview_date = body.interview_date
    if body.interview_notes is not None:
        application.interview_notes = body.interview_notes
    db.commit()
    db.refresh(application)
    return application


@router.patch("/{application_id}/response", response_model=ApplicationDetail)
def update_response(
    application_id: int,
    body: ResponseUpdateRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _get_user(user_id, db)
    application = _get_application(application_id, user_id, db)
    application.got_response = body.got_response
    application.response_type = body.response_type if body.got_response else None
    if body.got_response and application.response_date is None:
        application.response_date = datetime.now(timezone.utc)
    elif not body.got_response:
        application.response_date = None
    db.commit()
    db.refresh(application)
    return application


@router.post("/{application_id}/interview-prep", response_model=ApplicationDetail)
def create_interview_prep(
    application_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    user = _get_user(user_id, db)
    application = _get_application(application_id, user_id, db)

    if not application.job_description:
        raise HTTPException(status_code=400, detail="No job description on this application.")

    cv_text = user.base_cv_text or application.tailored_cv or ""
    if not cv_text:
        raise HTTPException(status_code=400, detail="No CV text available — upload a CV first.")

    try:
        prep = generate_interview_prep(application.job_description, cv_text)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Interview prep generation failed: {exc}")

    application.interview_prep = prep
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
    if not app.tailored_cv_json:
        raise HTTPException(status_code=404, detail="No tailored CV available for this application.")
    try:
        pdf = generate_cv_pdf(app.tailored_cv_json)
    except RuntimeError as exc:
        logger.error("LaTeX PDF generation failed for application %d: %s", application_id, exc)
        raise HTTPException(
            status_code=500,
            detail="PDF generation failed — please try again or contact support",
        )
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
    pdf = generate_pdf(
        f"Cover Letter — {app.job_title} at {app.company_name}",
        app.cover_letter,
    )
    filename = f"cover_letter_{_safe_filename(app.company_name)}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
