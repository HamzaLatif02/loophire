import html as html_lib
import json
import logging
import re
from typing import Optional
from urllib.parse import urlparse

import anthropic
import httpx
from readability import Document

logger = logging.getLogger("loophire.services.job_scraper")

_MODEL = "claude-haiku-4-5-20251001"
_client: Optional[anthropic.Anthropic] = None

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Loophire/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

_EXTRACT_SYSTEM = (
    "You are a structured data extractor. "
    "Given raw text scraped from a job listing page, extract the job title, company name, "
    "and the full cleaned job description. "
    "Return ONLY a JSON object — no markdown fences, no prose."
)

_EXTRACT_TEMPLATE = """\
Extract the job listing details from the text below.

Return ONLY a JSON object with exactly these fields:
{{
  "job_title": "<job title string>",
  "company_name": "<company name string>",
  "job_description": "<the full job description text, cleaned of navigation menus, cookie banners, and boilerplate>"
}}

If any field cannot be determined, use an empty string.

--- PAGE TEXT ---
{text}
"""


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


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def scrape_job(url: str) -> dict:
    """Fetch a job listing URL and extract structured job data via Claude."""
    try:
        _validate_url(url)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc

    try:
        response = httpx.get(url, headers=_HEADERS, timeout=15, follow_redirects=True)
    except httpx.TimeoutException:
        raise RuntimeError("Request timed out — the site took too long to respond.")
    except httpx.RequestError as exc:
        raise RuntimeError(f"Could not reach the URL: {exc}")

    if response.status_code == 403:
        raise RuntimeError(
            "This site blocked the request — please paste the job description manually."
        )
    if response.status_code != 200:
        raise RuntimeError(
            f"Site returned status {response.status_code} — please paste the job description manually."
        )

    try:
        doc = Document(response.text)
        text = _strip_html(doc.summary())
    except Exception as exc:
        logger.warning("readability parse failed (%s), falling back to raw strip", exc)
        text = _strip_html(response.text)

    if len(text) < 100:
        raise RuntimeError(
            "Could not extract readable content from this page — please paste the job description manually."
        )

    # Trim to stay within a sensible token budget
    text = text[:8000]

    prompt = _EXTRACT_TEMPLATE.format(text=text)

    try:
        message = _get_client().messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=_EXTRACT_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise RuntimeError(f"Claude API error: {exc}") from exc

    raw = message.content[0].text.strip()
    if not raw:
        raise RuntimeError(
            "Could not parse the job listing — please paste the job description manually."
        )

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("job_scraper: JSON parse failed: %s\nRaw: %.300s", exc, raw)
        raise RuntimeError(
            "Could not parse the job listing — please paste the job description manually."
        )

    return {
        "job_title": result.get("job_title", ""),
        "company_name": result.get("company_name", ""),
        "job_description": result.get("job_description", ""),
    }
