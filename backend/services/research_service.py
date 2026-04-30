import json
import logging
import os
import re
import time
from typing import Optional

import anthropic
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("loophire.services.research")

_MODEL = "claude-haiku-4-5-20251001"
_TAVILY_URL = "https://api.tavily.com/search"
_TAVILY_KEY = os.getenv("TAVILY_API_KEY", "")
_anthropic_client: Optional[anthropic.Anthropic] = None


def _get_anthropic() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env at call time
    return _anthropic_client

_SYSTEM_PROMPT = (
    "You are a business analyst synthesising web search results about a company. "
    "You always respond with valid JSON only — no markdown fences, no prose outside the JSON object."
)

_SYNTHESIS_TEMPLATE = """\
Synthesise the search results below into a structured company profile for {company_name}.

Return ONLY a JSON object with exactly these fields:
{{
  "culture_summary": "<2-3 sentence description of company culture and values>",
  "tech_stack": [<list of technologies, languages, or platforms mentioned>],
  "recent_news": [<up to 5 notable recent developments, one sentence each>],
  "red_flags": [<any concerns: layoffs, poor reviews, legal issues, instability — empty list if none>],
  "tone_recommendation": "<one of: formal | professional | startup-casual | creative>"
}}

If information for a field is absent from the search results, use an empty list or a brief
"No information found" string rather than fabricating details.

--- SEARCH RESULTS ---
{search_results}
"""


def _tavily_search(query: str, max_results: int = 5) -> list:
    """Run a single Tavily search and return a flat list of result dicts."""
    if not _TAVILY_KEY:
        logger.debug("research: TAVILY_API_KEY not set — skipping search for %r", query)
        return []

    try:
        t0 = time.monotonic()
        response = httpx.post(
            _TAVILY_URL,
            json={
                "api_key": _TAVILY_KEY,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
                "include_answer": False,
            },
            timeout=15.0,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        logger.info(
            "research: Tavily search %r → %d results in %.1fs",
            query, len(results), time.monotonic() - t0,
        )
        return results
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as exc:
        logger.warning("research: Tavily search failed for %r: %s", query, exc)
        return []


def _format_results(all_results: list) -> str:
    """Render aggregated search results as numbered plain-text snippets."""
    if not all_results:
        return "No search results available."

    lines = []
    for i, r in enumerate(all_results, 1):
        title = r.get("title", "")
        url = r.get("url", "")
        snippet = r.get("content", r.get("snippet", ""))
        lines.append(f"[{i}] {title}\n    {url}\n    {snippet}\n")
    return "\n".join(lines)


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def research_company(company_name: str) -> Optional[dict]:
    """Search for company information and return a structured research dict.

    Returns None if no API keys are configured or all searches fail.
    """
    queries = [
        f"{company_name} company culture values",
        f"{company_name} tech stack engineering",
        f"{company_name} recent news 2025",
    ]

    all_results = []
    for query in queries:
        results = _tavily_search(query, max_results=5)
        all_results.extend(results)

    # Deduplicate by URL, preserving order
    seen_urls = set()
    unique_results = []
    for r in all_results:
        url = r.get("url", "")
        if url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(r)

    formatted = _format_results(unique_results)

    prompt = _SYNTHESIS_TEMPLATE.format(
        company_name=company_name,
        search_results=formatted,
    )

    logger.info(
        "research: calling %s for %r synthesis (%d unique results)",
        _MODEL, company_name, len(unique_results),
    )
    t0 = time.monotonic()

    try:
        message = _get_anthropic().messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": _SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        logger.error("research: API error after %.1fs: %s", time.monotonic() - t0, exc)
        raise RuntimeError(f"Claude API error during research synthesis: {exc}") from exc

    elapsed = time.monotonic() - t0
    usage = message.usage
    logger.info(
        "research: synthesis completed in %.1fs — input_tokens=%d output_tokens=%d cache_read=%d",
        elapsed,
        usage.input_tokens,
        usage.output_tokens,
        getattr(usage, "cache_read_input_tokens", 0),
    )

    raw = message.content[0].text.strip()
    cleaned = _strip_fences(raw)

    try:
        result = json.loads(cleaned)
        logger.info("research: parsed research for %r successfully", company_name)
        return result
    except json.JSONDecodeError as exc:
        logger.error("research: JSON parse failed: %s\nRaw: %.200s", exc, raw)
        raise ValueError(
            f"Claude returned invalid JSON for research: {exc}\nRaw: {raw}"
        ) from exc
