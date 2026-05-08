import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from services.adzuna_service import search_adzuna
from services.job_scraper_service import scrape_job
from services.reed_service import get_reed_job, search_reed
from utils.rate_limiter import LIMITS, limiter
from utils.sanitiser import sanitise_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobSearchRequest(BaseModel):
    keywords: str
    location: str = ""
    source: str = "both"  # "reed" | "adzuna" | "both"
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    employment_type: Optional[str] = None   # "full_time" | "part_time"
    contract_type: Optional[str] = None     # "permanent" | "contract" | "temporary" (Reed only)
    date_posted: Optional[str] = None       # days: "1" | "3" | "7" | "14"
    sort_by: Optional[str] = None           # "relevance" | "date" | "salary_desc" | "salary_asc" (Adzuna only)

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v: str) -> str:
        v = sanitise_text(v, "search_keywords")
        if len(v) < 2:
            raise ValueError("Please enter at least 2 characters for the job title.")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: str) -> str:
        return sanitise_text(v, "search_location")

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        if v not in ("reed", "adzuna", "both"):
            raise ValueError("Source must be 'reed', 'adzuna', or 'both'.")
        return v

    @field_validator("min_salary", "max_salary")
    @classmethod
    def validate_salary(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v < 0:
            raise ValueError("Salary cannot be negative.")
        if v > 10_000_000:
            raise ValueError("Salary value is unrealistically high.")
        return v

    @field_validator("employment_type")
    @classmethod
    def validate_employment_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ("full_time", "part_time"):
            raise ValueError("Employment type must be 'full_time' or 'part_time'.")
        return v

    @field_validator("contract_type")
    @classmethod
    def validate_contract_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ("permanent", "contract", "temporary"):
            raise ValueError("Contract type must be 'permanent', 'contract', or 'temporary'.")
        return v


class JobImportRequest(BaseModel):
    job_id: str
    source: str  # "reed" | "adzuna"
    url: Optional[str] = None  # used for adzuna (redirect_url from search results)


@router.post("/search")
@limiter.limit(LIMITS["job_search"])
def job_search(request: Request, body: JobSearchRequest) -> List[dict]:
    kw = body.keywords.strip()
    if not kw:
        raise HTTPException(status_code=422, detail="keywords must not be empty")

    results = []
    if body.source in ("reed", "both"):
        results.extend(search_reed(
            kw, body.location,
            min_salary=body.min_salary,
            employment_type=body.employment_type,
            contract_type=body.contract_type,
            date_posted=body.date_posted,
        ))
    if body.source in ("adzuna", "both"):
        results.extend(search_adzuna(
            kw, body.location,
            min_salary=body.min_salary,
            max_salary=body.max_salary,
            employment_type=body.employment_type,
            date_posted=body.date_posted,
            sort_by=body.sort_by,
        ))

    if not results and body.source == "both":
        raise HTTPException(
            status_code=503,
            detail="Job search APIs are not configured. Please set REED_API_KEY or ADZUNA_APP_ID/ADZUNA_APP_KEY.",
        )

    return results


@router.post("/import")
@limiter.limit(LIMITS["job_import"])
async def job_import(request: Request, body: JobImportRequest) -> dict:
    if body.source == "reed":
        try:
            return get_reed_job(body.job_id)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc))

    if body.source == "adzuna":
        if not body.url:
            raise HTTPException(status_code=422, detail="url is required for adzuna imports")
        try:
            return await asyncio.wait_for(scrape_job(body.url), timeout=25.0)
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Import timed out. Please paste the job description manually.")
        except (ValueError, RuntimeError) as exc:
            raise HTTPException(status_code=502, detail=str(exc))

    raise HTTPException(status_code=422, detail=f"Unknown source: {body.source!r}")
