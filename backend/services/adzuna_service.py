import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
_BASE = "https://api.adzuna.com/v1/api/jobs/gb/search"


def search_adzuna(
    keywords: str,
    location: str = "London",
    count: int = 10,
    min_salary: int = None,
    max_salary: int = None,
    employment_type: str = None,
    date_posted: str = None,
    sort_by: str = None,
) -> list:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        logger.warning("adzuna_service: ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping")
        return []
    params: dict = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": keywords,
        "where": location,
        "results_per_page": count,
        "content-type": "application/json",
    }
    if min_salary:
        params["salary_min"] = min_salary
    if max_salary:
        params["salary_max"] = max_salary
    if date_posted:
        params["max_days_old"] = date_posted
    if sort_by == "date":
        params["sort_by"] = "date"
    elif sort_by == "salary_desc":
        params["sort_by"] = "salary"
        params["sort_direction"] = "down"
    elif sort_by == "salary_asc":
        params["sort_by"] = "salary"
        params["sort_direction"] = "up"
    if employment_type == "full_time":
        params["full_time"] = "1"
    elif employment_type == "part_time":
        params["part_time"] = "1"
    try:
        resp = httpx.get(
            f"{_BASE}/1",
            params=params,
            timeout=10.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(f"adzuna_service: search failed: {exc}")
        return []

    results = []
    for job in resp.json().get("results", []):
        desc = job.get("description", "") or ""
        results.append({
            "job_id": str(job.get("id", "")),
            "job_title": job.get("title", ""),
            "company_name": (job.get("company") or {}).get("display_name", ""),
            "location": (job.get("location") or {}).get("display_name", ""),
            "description": desc[:150],
            "url": job.get("redirect_url", ""),
            "source": "adzuna",
        })
    return results
