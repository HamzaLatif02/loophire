import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.adzuna_service import search_adzuna
from services.job_scraper_service import scrape_job
from services.reed_service import get_reed_job, search_reed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobSearchRequest(BaseModel):
    keywords: str
    location: str = "London"
    source: str = "both"  # "reed" | "adzuna" | "both"


class JobImportRequest(BaseModel):
    job_id: str
    source: str  # "reed" | "adzuna"
    url: Optional[str] = None  # used for adzuna (redirect_url from search results)


@router.post("/search")
def job_search(body: JobSearchRequest) -> List[dict]:
    kw = body.keywords.strip()
    if not kw:
        raise HTTPException(status_code=422, detail="keywords must not be empty")

    results = []
    if body.source in ("reed", "both"):
        results.extend(search_reed(kw, body.location))
    if body.source in ("adzuna", "both"):
        results.extend(search_adzuna(kw, body.location))

    if not results and body.source == "both":
        raise HTTPException(
            status_code=503,
            detail="Job search APIs are not configured. Please set REED_API_KEY or ADZUNA_APP_ID/ADZUNA_APP_KEY.",
        )

    return results


@router.post("/import")
async def job_import(body: JobImportRequest) -> dict:
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
