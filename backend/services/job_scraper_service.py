import html as html_lib
import json
import logging
import os
import re
from typing import Optional
from urllib.parse import parse_qs, urlparse

import anthropic
import httpx
from curl_cffi.requests import AsyncSession
from dotenv import load_dotenv
from readability import Document

load_dotenv()

logger = logging.getLogger(__name__)

_MODEL = "claude-haiku-4-5-20251001"
_TAVILY_KEY = os.getenv("TAVILY_API_KEY", "")
_anthropic_client: Optional[anthropic.Anthropic] = None

# HTTP status codes that indicate the site is actively blocking us
_BLOCKED_CODES = {403, 429, 999}

# These supplement curl_cffi's built-in Chrome impersonation headers
_CURL_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}

_EXTRACT_SYSTEM = (
    "You are a structured data extractor. "
    "Given raw text scraped from a job listing page, extract the job title, company name, "
    "and the full cleaned job description. "
    "Return ONLY a JSON object — no markdown fences, no prose."
)

_EXTRACT_TEMPLATE = """\
Extract the job details from this page content.

LinkedIn job pages typically show the job title near the top, the company name \
below it, then an "About the job" or description section further down.
Other job boards follow similar patterns — title, company, then full description.

Return ONLY a JSON object with exactly these fields:
{{
  "job_title": "exact job title",
  "company_name": "exact company name",
  "job_description": "the complete job description text including all responsibilities, \
requirements, and qualifications — minimum 100 words"
}}

Rules:
- job_description must include the full text: responsibilities, requirements, qualifications, \
nice-to-haves. Do not summarise.
- Strip navigation menus, cookie banners, "Apply now" buttons, and unrelated boilerplate.
- If job_description is missing or under 50 words, set it to an empty string "" so the \
caller can detect the failure.
- If job_title or company_name cannot be determined, use an empty string.

--- PAGE TEXT ---
{text}
"""


def normalise_job_url(url: str) -> str:
    """Convert job board search/redirect URLs to canonical direct-listing URLs."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    # LinkedIn search page with currentJobId → direct view URL
    if "linkedin.com/jobs/search" in url:
        job_id = params.get("currentJobId", [None])[0]
        if job_id:
            return f"https://www.linkedin.com/jobs/view/{job_id}/"

    # Indeed (any subdomain: uk, ca, au, www, …) — strip all tracking,
    # keep only the jk job ID, preserve the original subdomain
    if "indeed.com" in url:
        job_id = params.get("jk", [None])[0]
        if job_id:
            subdomain = parsed.netloc  # e.g. uk.indeed.com
            return f"https://{subdomain}/viewjob?jk={job_id}"

    return url


def _should_use_tavily_directly(url: str) -> bool:
    """Return True for sites that serve JS-rendered pages httpx cannot parse."""
    js_heavy_domains = ["indeed.com", "linkedin.com"]
    return any(domain in url for domain in js_heavy_domains)


def _validate_url(url: str) -> None:
    try:
        parsed = urlparse(url)
    except Exception as exc:
        raise ValueError(f"Invalid URL: {exc}") from exc
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must start with http:// or https://")
    if not parsed.netloc:
        raise ValueError("Invalid URL — no domain found")


def _strip_html(html_content: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html_content)
    text = html_lib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _get_anthropic() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic()
    return _anthropic_client


async def _fetch_with_curl(url: str) -> tuple[int, str]:
    """Fetch with curl_cffi Chrome TLS impersonation."""
    async with AsyncSession() as session:
        resp = await session.get(
            url,
            impersonate="chrome120",
            headers=_CURL_HEADERS,
            timeout=15,
            allow_redirects=True,
        )
    return resp.status_code, resp.text


async def _fetch_with_tavily(url: str) -> str:
    """Fallback: use Tavily /extract to retrieve page content."""
    if not _TAVILY_KEY:
        logger.debug("job_scraper: TAVILY_API_KEY not set — skipping Tavily fallback")
        return ""
    logger.info(f"job_scraper: trying Tavily extract for {url}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.tavily.com/extract",
                json={"urls": [url]},
                headers={"Authorization": f"Bearer {_TAVILY_KEY}"},
            )
        logger.info(f"job_scraper: Tavily extract status: {resp.status_code}")
        if resp.status_code != 200:
            logger.warning(f"job_scraper: Tavily returned non-200: {resp.text[:200]}")
            return ""
        data = resp.json()
        results = data.get("results", [])
        if results:
            content = results[0].get("raw_content", "")
            logger.info(f"job_scraper: Tavily extracted content length: {len(content)} chars")
            return content
        logger.warning("job_scraper: Tavily returned no results")
        return ""
    except Exception as exc:
        logger.warning(f"job_scraper: Tavily extract failed: {exc}")
        return ""


def _extract_text(html_content: str) -> str:
    """Extract readable text from HTML using readability, falling back to raw strip."""
    try:
        doc = Document(html_content)
        text = _strip_html(doc.summary())
        logger.info(f"job_scraper: readability extracted {len(text)} chars")
        return text
    except Exception as exc:
        logger.warning(f"job_scraper: readability failed ({exc}), using raw strip")
        text = _strip_html(html_content)
        logger.info(f"job_scraper: raw strip extracted {len(text)} chars")
        return text


def _call_claude(text: str) -> dict:
    prompt = _EXTRACT_TEMPLATE.format(text=text[:8000])
    logger.info("job_scraper: sending to Claude for extraction")

    try:
        message = _get_anthropic().messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=_EXTRACT_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise RuntimeError(f"Claude API error: {exc}") from exc

    logger.info("job_scraper: Claude response received")
    raw = message.content[0].text.strip()
    if not raw:
        raise RuntimeError("Claude returned empty response — please paste the job description manually.")

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(f"job_scraper: JSON parse failed: {exc} | raw: {raw[:300]}")
        raise RuntimeError("Could not parse the job listing — please paste the job description manually.")

    extracted = {
        "job_title": result.get("job_title", ""),
        "company_name": result.get("company_name", ""),
        "job_description": result.get("job_description", ""),
    }
    if not extracted["job_description"]:
        raise RuntimeError(
            "Could not extract a job description from this page — "
            "please paste the job description manually."
        )
    return extracted


async def scrape_job(url: str) -> dict:
    """Fetch a job listing URL and extract structured job data.

    Strategy:
      1. curl_cffi with Chrome TLS impersonation
      2. Tavily /extract fallback if blocked or empty
      3. Raise 422-suitable ValueError if both fail
    """
    logger.info(f"job_scraper: scraping URL: {url}")
    _validate_url(url)
    url = normalise_job_url(url)
    logger.info(f"job_scraper: normalised URL: {url}")

    text = ""

    if _should_use_tavily_directly(url):
        # ── JS-heavy site: go straight to Tavily ────────────────────────────
        logger.info(f"job_scraper: known JS-heavy site — skipping curl, using Tavily directly")
        text = await _fetch_with_tavily(url)
    else:
        # ── step 1: curl_cffi ───────────────────────────────────────────────
        try:
            status_code, html = await _fetch_with_curl(url)
            logger.info(f"job_scraper: HTTP response status: {status_code}")
            logger.info(f"job_scraper: response length: {len(html)} chars")

            if status_code in _BLOCKED_CODES:
                logger.warning(f"job_scraper: site returned {status_code} — trying Tavily fallback")
            elif status_code != 200:
                logger.warning(f"job_scraper: unexpected status {status_code} — trying Tavily fallback")
            else:
                text = _extract_text(html)

        except Exception as exc:
            logger.warning(f"job_scraper: curl_cffi fetch failed: {exc} — trying Tavily fallback")

        # ── step 2: Tavily fallback ─────────────────────────────────────────
        if len(text) < 200:
            logger.info("job_scraper: primary fetch yielded insufficient content, falling back to Tavily")
            tavily_text = await _fetch_with_tavily(url)
            if len(tavily_text) > len(text):
                text = tavily_text

    logger.info(f"job_scraper: total extracted content length: {len(text)} chars")

    # ── give up cleanly ─────────────────────────────────────────────────────
    if len(text) < 200:
        raise ValueError(
            "Could not extract job description from this URL. "
            "Try opening the job in a new browser tab, copying the clean URL "
            "from the address bar, and pasting it here."
        )

    return _call_claude(text)
