import asyncio
import logging
import re
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from agents.fit_agent import analyse_fit
from agents.interview_agent import generate_interview_prep
from agents.tone_agent import analyse_tone
from agents.writer_agent import write_application
from database import SessionLocal, get_db
from dependencies.auth_dependency import get_current_user
from dependencies.demo_guard import require_non_demo
from services.job_scraper_service import scrape_job
from services.latex_export_service import (
    generate_cv_pdf,
    linkify_live_sites,
    linkify_urls_in_text,
    process_bullet,
)
from services.memory_service import get_preferences
from services.pdf_export_service import generate_pdf
from services.research_service import research_company
from models.application import Application, ApplicationStatus
from models.cv_version import CVVersion
from models.user import User
from schemas.application import (
    AnalyticsResponse,
    ApplicationDetail,
    ApplicationGenerateRequest,
    ApplicationPatchRequest,
    ApplicationStatusUpdate,
    ApplicationSummary,
    ExtensionImportRequest,
    InterviewUpdateRequest,
    NotesUpdateRequest,
    ResponseUpdateRequest,
    ScrapeJobRequest,
)
from utils.progress import progress_manager
from utils.rate_limiter import LIMITS, limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _get_application(application_id: int, user_id: int, db: Session) -> Application:
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.user_id == user_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


# ── Generation pipeline ───────────────────────────────────────────────────────

async def run_generation_pipeline(
    job_id: str,
    user_id: int,
    body: ApplicationGenerateRequest,
    cv_text: str,
    cv_links: list,
    user_preferences,
    cv_version_name: Optional[str] = None,
):
    p = progress_manager
    do_write = body.rewrite_cv or body.generate_cover_letter
    # Brief pause so the WebSocket client has time to connect
    await asyncio.sleep(0.4)

    try:
        await p.send_progress(job_id, "cv", "CV loaded.", 8)

        await p.send_progress(job_id, "research", "Researching the company…", 20)
        try:
            company_research = await asyncio.to_thread(
                research_company, body.company_name, user_id
            )
        except Exception:
            company_research = None

        await p.send_progress(job_id, "tone", "Analysing job description tone…", 36)
        tone_result: Optional[dict] = None
        try:
            tone_result = await asyncio.to_thread(
                analyse_tone, body.job_description, user_id
            )
        except Exception as exc:
            logger.warning("pipeline[%s]: tone analysis failed (non-fatal): %s", job_id, exc)

        await p.send_progress(job_id, "fit", "Scoring your fit for this role…", 54)
        fit_analysis = await asyncio.to_thread(
            analyse_fit, cv_text, body.job_description, user_id
        )

        written: Optional[dict] = None
        if do_write:
            if body.rewrite_cv:
                await p.send_progress(job_id, "cv_tailor", "Tailoring your CV…", 68)
            else:
                await p.send_progress(job_id, "cover_letter", "Writing cover letter…", 68)
            written = await asyncio.to_thread(
                write_application,
                cv_text=cv_text,
                job_description=body.job_description,
                fit_analysis=fit_analysis,
                company_research=company_research,
                user_preferences=user_preferences,
                cv_links=cv_links,
                tone_analysis=tone_result,
                user_id=user_id,
            )
            if body.rewrite_cv and body.generate_cover_letter:
                await p.send_progress(job_id, "cover_letter", "Cover letter written.", 84)

        await p.send_progress(job_id, "saving", "Saving your application…", 93)

        # Build shared kwargs for application fields
        app_fields: dict = {
            "job_title":               body.job_title,
            "company_name":            body.company_name,
            "job_description":         body.job_description,
            "fit_score":               fit_analysis.get("fit_score"),
            "keyword_gaps":            fit_analysis.get("keyword_gaps"),
            "company_research":        company_research,
            "tone_analysis":           tone_result,
            "cv_version_name":         cv_version_name,
            "rewrite_cv":              body.rewrite_cv,
            "cover_letter_generated":  body.generate_cover_letter,
        }
        if written and body.rewrite_cv:
            app_fields["tailored_cv"]      = written.get("tailored_cv")
            app_fields["tailored_cv_json"] = written.get("tailored_cv_json")
        if written and body.generate_cover_letter:
            app_fields["cover_letter"] = written.get("cover_letter")

        db = SessionLocal()
        try:
            if body.existing_application_id:
                application = db.query(Application).filter(
                    Application.id == body.existing_application_id,
                    Application.user_id == user_id,
                ).first()
                if application:
                    for k, v in app_fields.items():
                        setattr(application, k, v)
                    application.last_generated_at = datetime.now(timezone.utc)
                    db.commit()
                    db.refresh(application)
                    app_id = application.id
                else:
                    application = Application(
                        user_id=user_id, status=ApplicationStatus.draft, **app_fields
                    )
                    db.add(application)
                    db.commit()
                    db.refresh(application)
                    app_id = application.id
            else:
                application = Application(
                    user_id=user_id, status=ApplicationStatus.draft, **app_fields
                )
                db.add(application)
                db.commit()
                db.refresh(application)
                app_id = application.id
        finally:
            db.close()

        await p.send_progress(job_id, "done", "Application ready!", 100, "done")
        ws = p.connections.get(job_id)
        if ws:
            try:
                await ws.send_json({
                    "stage":          "complete",
                    "application_id": app_id,
                    "status":         "done",
                    "percent":        100,
                })
            except Exception:
                pass

    except Exception as exc:
        logger.error("Pipeline error for job %s: %s", job_id, exc, exc_info=True)
        await p.send_error(job_id, "Something went wrong during generation. Please try again.")


async def run_regeneration_pipeline(
    job_id: str,
    application_id: int,
    user_id: int,
    cv_text: str,
    cv_links: list,
    user_preferences,
):
    p = progress_manager
    await asyncio.sleep(0.4)

    try:
        # Fetch the application's stored fields inside the pipeline
        db = SessionLocal()
        try:
            application = db.query(Application).filter(
                Application.id == application_id, Application.user_id == user_id
            ).first()
            if not application:
                await p.send_error(job_id, "Application not found.")
                return
            job_title       = application.job_title
            company_name    = application.company_name
            job_description = application.job_description
        finally:
            db.close()

        await p.send_progress(job_id, "cv", "CV loaded.", 8)

        await p.send_progress(job_id, "research", "Researching the company…", 18)
        try:
            company_research = await asyncio.to_thread(
                research_company, company_name, user_id, application_id
            )
        except Exception:
            company_research = None

        await p.send_progress(job_id, "tone", "Analysing job description tone…", 34)
        tone_result: Optional[dict] = None
        try:
            tone_result = await asyncio.to_thread(
                analyse_tone, job_description, user_id, application_id
            )
        except Exception as exc:
            logger.warning("regen[%s]: tone analysis failed (non-fatal): %s", job_id, exc)

        await p.send_progress(job_id, "fit", "Scoring your fit for this role…", 50)
        fit_analysis = await asyncio.to_thread(
            analyse_fit, cv_text, job_description, user_id, application_id
        )

        await p.send_progress(job_id, "cv_tailor", "Tailoring your CV…", 66)
        written = await asyncio.to_thread(
            write_application,
            cv_text=cv_text,
            job_description=job_description,
            fit_analysis=fit_analysis,
            company_research=company_research,
            user_preferences=user_preferences,
            cv_links=cv_links,
            tone_analysis=tone_result,
            user_id=user_id,
            application_id=application_id,
        )

        await p.send_progress(job_id, "cover_letter", "Cover letter written.", 84)

        await p.send_progress(job_id, "saving", "Saving your application…", 93)
        db = SessionLocal()
        try:
            application = db.query(Application).filter(
                Application.id == application_id, Application.user_id == user_id
            ).first()
            if not application:
                await p.send_error(job_id, "Application not found.")
                return
            application.fit_score        = fit_analysis.get("fit_score")
            application.keyword_gaps     = fit_analysis.get("keyword_gaps")
            application.company_research = company_research
            application.tailored_cv      = written["tailored_cv"]
            application.tailored_cv_json = written["tailored_cv_json"]
            application.cover_letter     = written["cover_letter"]
            application.tone_analysis    = written.get("tone_analysis")
            application.last_generated_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()

        await p.send_progress(job_id, "done", "Application ready!", 100, "done")
        ws = p.connections.get(job_id)
        if ws:
            try:
                await ws.send_json({
                    "stage":          "complete",
                    "application_id": application_id,
                    "status":         "done",
                    "percent":        100,
                })
            except Exception:
                pass

    except Exception as exc:
        logger.error("Regen pipeline error for job %s: %s", job_id, exc, exc_info=True)
        await p.send_error(job_id, "Something went wrong during regeneration. Please try again.")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/scrape-job")
@limiter.limit(LIMITS["app_scrape_job"])
async def scrape_job_endpoint(
    request: Request,
    body: ScrapeJobRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        return await asyncio.wait_for(scrape_job(body.url), timeout=25.0)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=408,
            detail="Job scraping timed out. Please paste the job description manually.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/import-from-extension", status_code=201)
@limiter.limit(LIMITS["app_import_ext"])
def import_from_extension(
    request: Request,
    body: ExtensionImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = Application(
        user_id=current_user.id,
        job_title=body.job_title,
        company_name=body.company_name,
        job_description=body.job_description,
        source_url=body.source_url,
        status=body.status,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return {"id": app.id, "job_title": app.job_title, "company_name": app.company_name, "status": app.status}


@router.post("/generate", status_code=202)
@limiter.limit(LIMITS["app_generate"])
async def generate_application(
    request: Request,
    body: ApplicationGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    # Resolve CV synchronously so we can fail fast on missing CV
    cv_text: str | None = None
    cv_links: list = []
    cv_version_name: str | None = None

    if body.cv_version_id:
        cv_ver = (
            db.query(CVVersion)
            .filter(CVVersion.id == body.cv_version_id, CVVersion.user_id == current_user.id)
            .first()
        )
        if not cv_ver:
            raise HTTPException(status_code=404, detail="CV version not found.")
        cv_text = cv_ver.cv_text
        cv_version_name = cv_ver.name
    else:
        default_ver = (
            db.query(CVVersion)
            .filter(CVVersion.user_id == current_user.id, CVVersion.is_default == True)  # noqa: E712
            .first()
        )
        if default_ver:
            cv_text = default_ver.cv_text
            cv_version_name = default_ver.name
        else:
            cv_text = current_user.base_cv_text
            cv_links = current_user.cv_links or []

    if not cv_text:
        raise HTTPException(
            status_code=400,
            detail="No CV on file. Upload a CV before generating an application.",
        )

    user_preferences = get_preferences(current_user.id)
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        run_generation_pipeline,
        job_id=job_id,
        user_id=current_user.id,
        body=body,
        cv_text=cv_text,
        cv_links=cv_links,
        user_preferences=user_preferences,
        cv_version_name=cv_version_name,
    )

    return {"job_id": job_id}


@router.post("/{application_id}/regenerate", status_code=202)
@limiter.limit(LIMITS["app_regenerate"])
async def regenerate_application(
    request: Request,
    application_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)

    if not application.job_description:
        raise HTTPException(status_code=400, detail="No job description stored — cannot regenerate.")

    cv_text: str | None = None
    cv_links: list = []

    default_ver = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == current_user.id, CVVersion.is_default == True)  # noqa: E712
        .first()
    )
    if default_ver:
        cv_text = default_ver.cv_text
    else:
        cv_text = current_user.base_cv_text
        cv_links = current_user.cv_links or []

    if not cv_text:
        raise HTTPException(
            status_code=400,
            detail="No CV on file. Upload a CV before regenerating.",
        )

    user_preferences = get_preferences(current_user.id)
    job_id = str(uuid.uuid4())

    background_tasks.add_task(
        run_regeneration_pipeline,
        job_id=job_id,
        application_id=application_id,
        user_id=current_user.id,
        cv_text=cv_text,
        cv_links=cv_links,
        user_preferences=user_preferences,
    )

    return {"job_id": job_id}


@router.get("", response_model=List[ApplicationSummary])
@limiter.limit(LIMITS["app_list"])
def list_applications(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )


@router.get("/upcoming-interviews", response_model=List[ApplicationSummary])
@limiter.limit(LIMITS["app_list"])
def get_upcoming_interviews(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    return (
        db.query(Application)
        .filter(
            Application.user_id == current_user.id,
            Application.interview_date.isnot(None),
            Application.interview_date > now,
        )
        .order_by(Application.interview_date.asc())
        .all()
    )


@router.get("/analytics", response_model=AnalyticsResponse)
@limiter.limit(LIMITS["app_list"])
def get_analytics(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
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


@router.delete("/{application_id}", status_code=200)
@limiter.limit(LIMITS["app_update"])
def delete_application(
    request: Request,
    application_id: int,
    current_user: User = Depends(require_non_demo),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)
    db.delete(application)
    db.commit()
    return {"id": application_id}


@router.get("/{application_id}", response_model=ApplicationDetail)
@limiter.limit(LIMITS["app_detail"])
def get_application(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_application(application_id, current_user.id, db)


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
@limiter.limit(LIMITS["app_update"])
def patch_application(
    request: Request,
    application_id: int,
    body: ApplicationPatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)
    if body.tailored_cv_json is not None:
        application.tailored_cv_json = body.tailored_cv_json
        application.tailored_cv = _flatten_cv_json(body.tailored_cv_json)
    if body.cover_letter is not None:
        application.cover_letter = body.cover_letter
    db.commit()
    db.refresh(application)
    return application


@router.patch("/{application_id}/status", response_model=ApplicationDetail)
@limiter.limit(LIMITS["app_update"])
def update_status(
    request: Request,
    application_id: int,
    body: ApplicationStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)
    application.status = body.status
    db.commit()
    db.refresh(application)
    return application


@router.patch("/{application_id}/interview", response_model=ApplicationDetail)
@limiter.limit(LIMITS["app_update"])
def update_interview(
    request: Request,
    application_id: int,
    body: InterviewUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)
    if body.interview_date is not None:
        application.interview_date = body.interview_date
    if body.interview_notes is not None:
        application.interview_notes = body.interview_notes
    db.commit()
    db.refresh(application)
    return application


@router.patch("/{application_id}/notes")
@limiter.limit(LIMITS["app_notes"])
def update_notes(
    request: Request,
    application_id: int,
    body: NotesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)
    application.notes = body.notes
    db.commit()
    return {"id": application.id, "notes": application.notes}


@router.patch("/{application_id}/response", response_model=ApplicationDetail)
@limiter.limit(LIMITS["app_update"])
def update_response(
    request: Request,
    application_id: int,
    body: ResponseUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)
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
@limiter.limit(LIMITS["app_interview_prep"])
def create_interview_prep(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = _get_application(application_id, current_user.id, db)

    if not application.job_description:
        raise HTTPException(status_code=400, detail="No job description on this application.")

    cv_text = current_user.base_cv_text or application.tailored_cv or ""
    if not cv_text:
        raise HTTPException(status_code=400, detail="No CV text available — upload a CV first.")

    try:
        prep = generate_interview_prep(
            application.job_description, cv_text,
            user_id=current_user.id, application_id=application_id,
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Interview prep generation failed: {exc}")

    application.interview_prep = prep
    db.commit()
    db.refresh(application)
    return application


def _safe_filename(text: str) -> str:
    return re.sub(r"[^\w]+", "_", text).strip("_").lower()


@router.post("/debug/latex-process")
async def debug_latex_process(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Debug endpoint: show each stage of the bullet linkification pipeline."""
    body = await request.json()
    text = body.get("text", "")
    step1 = linkify_live_sites(text)
    step2 = linkify_urls_in_text(step1)
    step3 = process_bullet(text)
    return {
        "input": text,
        "after_live_sites": step1,
        "after_urls": step2,
        "final": step3,
    }


@router.get("/{application_id}/export/cv")
@limiter.limit(LIMITS["app_export_pdf"])
def export_cv(
    request: Request,
    application_id: int,
    template_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_application(application_id, current_user.id, db)
    if not app.tailored_cv_json:
        raise HTTPException(status_code=404, detail="No tailored CV available for this application.")

    # Determine effective template: explicit override > CV version default > classic
    effective_template = "classic"
    if template_id:
        effective_template = template_id
    elif app.cv_version_id:
        cv_ver = db.query(CVVersion).filter(CVVersion.id == app.cv_version_id).first()
        if cv_ver and cv_ver.template_id:
            effective_template = cv_ver.template_id

    try:
        pdf = generate_cv_pdf(app.tailored_cv_json, template_id=effective_template)
    except RuntimeError as exc:
        logger.error("LaTeX PDF generation failed for application %d: %s", application_id, exc)
        raise HTTPException(
            status_code=500,
            detail="PDF generation failed — please try again or contact support",
        )
    filename = f"tailored_cv_{_safe_filename(app.company_name)}_{effective_template}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{application_id}/export/cover-letter")
@limiter.limit(LIMITS["app_export_pdf"])
def export_cover_letter(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_application(application_id, current_user.id, db)
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
