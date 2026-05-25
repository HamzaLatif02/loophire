import json
import logging
import os
import re
import time
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

from utils.claude_helpers import cached_system_prompt, cached_text_block, log_cache_stats, uncached_text_block

logger = logging.getLogger("loophire.agents.fit")

_MODEL = "claude-sonnet-4-6"
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


_SYSTEM_PROMPT = (
    "You are an expert technical recruiter and career coach. "
    "You analyse CVs against job descriptions with precision and objectivity. "
    "You always respond with valid JSON only — no markdown fences, no prose outside the JSON object.\n\n"
    "When asked to analyse fit, return ONLY a JSON object with exactly these fields:\n"
    "{\n"
    '  "fit_score": <integer 0-100>,\n'
    '  "reasoning": "<2-3 sentence explanation of the score>",\n'
    '  "jd_keywords": [<top 10 keywords/skills extracted from the job description>],\n'
    '  "keyword_gaps": [<keywords from jd_keywords that are missing or weak in the CV>],\n'
    '  "strengths": [<3-5 specific strengths from the CV that match the role>]\n'
    "}"
)

_CV_INTRO = "Analyse the fit between the CV and the job description below.\n\n--- CV ---\n"


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def analyse_fit(
    cv_text: str,
    job_description: str,
    user_id: Optional[int] = None,
    application_id: Optional[int] = None,
) -> dict:
    """Score a CV against a job description and return structured analysis."""
    from utils.sanitiser import check_prompt_injection, sanitise_text
    cv_text = sanitise_text(cv_text, "cv_text")
    job_description = sanitise_text(job_description, "job_description")
    check_prompt_injection(job_description, "job description")
    check_prompt_injection(cv_text, "CV")

    logger.info("fit_agent: calling %s (max_tokens=1024)", _MODEL)
    t0 = time.monotonic()

    try:
        response = _get_client().messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=cached_system_prompt(_SYSTEM_PROMPT),
            messages=[{
                "role": "user",
                "content": [
                    # CV text is stable per user — cached as the last stable block
                    cached_text_block(f"{_CV_INTRO}{cv_text}"),
                    # Job description changes every request — not cached
                    uncached_text_block(f"--- JOB DESCRIPTION ---\n{job_description}"),
                ],
            }],
        )
    except anthropic.APIError as exc:
        logger.error("fit_agent: API error after %.1fs: %s", time.monotonic() - t0, exc)
        raise RuntimeError(f"Claude API error: {exc}") from exc

    elapsed = time.monotonic() - t0
    log_cache_stats(logger, "fit_agent", response.usage)
    logger.info("fit_agent: completed in %.1fs", elapsed)

    if user_id:
        from services.usage_service import log_api_call
        log_api_call(user_id, "fit_agent", _MODEL, response.usage, application_id)

    raw = response.content[0].text
    cleaned = _strip_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("fit_agent: JSON parse failed: %s\nRaw: %.200s", exc, raw)
        raise ValueError(f"Claude returned invalid JSON: {exc}\nRaw response: {raw}") from exc

    logger.info("fit_agent: fit_score=%s", result.get("fit_score"))
    return result
