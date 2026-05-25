import json
import logging
import re
import time
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

from utils.claude_helpers import cached_system_prompt, cached_text_block, log_cache_stats, uncached_text_block

logger = logging.getLogger("loophire.agents.interview")

_MODEL = "claude-sonnet-4-6"
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


_SYSTEM_PROMPT = (
    "You are an expert interview coach and technical recruiter. "
    "You create targeted, insightful interview questions based on job descriptions and candidate CVs. "
    "You always respond with valid JSON only — no markdown fences, no prose outside the JSON object.\n\n"
    "When asked to generate interview preparation, return ONLY a JSON object with exactly this structure:\n"
    "{\n"
    '  "technical": [\n'
    '    {"question": "<specific technical question>", "framework": "<suggested answer guidance>"},\n'
    "    ... (5 questions total)\n"
    "  ],\n"
    '  "behavioural": [\n'
    '    {"question": "<behavioural question based on JD values>", "framework": "<STAR method: Situation, Task, Action, Result>"},\n'
    "    ... (3 questions total)\n"
    "  ],\n"
    '  "cv_based": [\n'
    '    {"question": "<question probing a specific experience from the CV>", "framework": "<talking points based on their background>"},\n'
    "    ... (3 questions total)\n"
    "  ]\n"
    "}\n\n"
    "Rules:\n"
    "- Technical questions must target specific technologies, architectures, and responsibilities in the JD\n"
    "- Behavioural questions must reference the values and working style implied by the JD\n"
    "- CV-based questions must reference specific projects, roles, or achievements visible in the CV\n"
    "- Each framework should be 2-4 sentences guiding how to structure and what to include in the answer\n"
    "- Do not repeat questions across categories"
)

_CV_INTRO = (
    "Generate interview preparation questions for a candidate applying to the role described below.\n\n"
    "--- CANDIDATE CV ---\n"
)


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def generate_interview_prep(
    job_description: str,
    cv_text: str,
    user_id: Optional[int] = None,
    application_id: Optional[int] = None,
) -> dict:
    """Generate structured interview questions for a role/CV combination."""
    from utils.sanitiser import check_prompt_injection, sanitise_text
    cv_text = sanitise_text(cv_text, "cv_text")
    job_description = sanitise_text(job_description, "job_description")
    check_prompt_injection(job_description, "job description")
    check_prompt_injection(cv_text, "CV")

    logger.info("interview_agent: calling %s", _MODEL)
    t0 = time.monotonic()

    try:
        response = _get_client().messages.create(
            model=_MODEL,
            max_tokens=2048,
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
        logger.error("interview_agent: API error after %.1fs: %s", time.monotonic() - t0, exc)
        raise RuntimeError(f"Claude API error: {exc}") from exc

    elapsed = time.monotonic() - t0
    log_cache_stats(logger, "interview_agent", response.usage)
    logger.info("interview_agent: completed in %.1fs", elapsed)

    if user_id:
        from services.usage_service import log_api_call
        log_api_call(user_id, "interview_agent", _MODEL, response.usage, application_id)

    raw = response.content[0].text
    if not raw.strip():
        raise RuntimeError("interview_agent: empty response from Claude")
    cleaned = _strip_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("interview_agent: JSON parse failed: %s\nRaw: %.500s", exc, raw)
        raise ValueError(f"Claude returned invalid JSON: {exc}") from exc

    return result
