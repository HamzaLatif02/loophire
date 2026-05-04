import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
_BASE = "https://api.adzuna.com/v1/api/jobs/gb/search"


def search_adzuna(keywords: str, location: str = "London", count: int = 10) -> list:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        logger.warning("adzuna_service: ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping")
        return []
    try:
        resp = httpx.get(
            f"{_BASE}/1",
            params={
                "app_id": ADZUNA_APP_ID,
                "app_key": ADZUNA_APP_KEY,
                "what": keywords,
                "where": location,
                "results_per_page": count,
            },
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
