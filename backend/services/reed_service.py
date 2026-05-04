import html as html_lib
import logging
import os
import re
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

REED_API_KEY = os.getenv("REED_API_KEY", "")
_BASE = "https://www.reed.co.uk/api/1.0"


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_lib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def search_reed(keywords: str, location: str = "London", count: int = 10) -> list:
    if not REED_API_KEY:
        logger.warning("reed_service: REED_API_KEY not set — skipping")
        return []
    try:
        resp = httpx.get(
            f"{_BASE}/search",
            params={"keywords": keywords, "locationName": location, "resultsToTake": count},
            auth=(REED_API_KEY, ""),
            timeout=10.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(f"reed_service: search failed: {exc}")
        return []

    results = []
    for job in resp.json().get("results", []):
        desc = _strip_html(job.get("jobDescription", "") or "")
        results.append({
            "job_id": str(job["jobId"]),
            "job_title": job.get("jobTitle", ""),
            "company_name": job.get("employerName", ""),
            "location": job.get("locationName", ""),
            "description": desc[:150],
            "url": job.get("jobUrl", ""),
            "source": "reed",
        })
    return results


def get_reed_job(job_id: str) -> dict:
    if not REED_API_KEY:
        raise RuntimeError("Reed API key not configured.")
    try:
        resp = httpx.get(
            f"{_BASE}/jobs/{job_id}",
            auth=(REED_API_KEY, ""),
            timeout=10.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Reed API error: {exc}") from exc

    job = resp.json()
    return {
        "job_title": job.get("jobTitle", ""),
        "company_name": job.get("employerName", ""),
        "job_description": _strip_html(job.get("jobDescription", "") or ""),
    }
