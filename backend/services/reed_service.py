import html as html_lib
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

REED_API_KEY = os.getenv("REED_API_KEY", "")
_BASE = "https://www.reed.co.uk/api/1.0"


def _days_ago_iso(days: int) -> str:
    dt = datetime.now(tz=timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_lib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def search_reed(
    keywords: str,
    location: str = "London",
    count: int = 10,
    min_salary: int = None,
    employment_type: str = None,
    contract_type: str = None,
    date_posted: str = None,
) -> list:
    if not REED_API_KEY:
        logger.warning("reed_service: REED_API_KEY not set — skipping")
        return []
    params: dict = {"keywords": keywords, "locationName": location, "resultsToTake": count}
    if min_salary:
        params["minimumSalary"] = min_salary
    if employment_type == "full_time":
        params["fullTime"] = "true"
    elif employment_type == "part_time":
        params["partTime"] = "true"
    if contract_type == "permanent":
        params["permanent"] = "true"
    elif contract_type == "contract":
        params["contract"] = "true"
    elif contract_type == "temporary":
        params["temp"] = "true"
    if date_posted:
        params["postedByRecruitmentAgency"] = "false"
        params["minimumDate"] = _days_ago_iso(int(date_posted))
    try:
        resp = httpx.get(
            f"{_BASE}/search",
            params=params,
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
