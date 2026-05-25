import json
import logging
import re
import time
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

from utils.claude_helpers import cached_system_prompt, log_cache_stats

logger = logging.getLogger("loophire.agents.tone")

_MODEL = "claude-haiku-4-5-20251001"
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


_SYSTEM = (
    "You are a tone analysis expert. Analyse a job description and identify the communication "
    "tone and style. Return ONLY a valid JSON object — no markdown fences, no commentary.\n\n"
    "Return a JSON object with exactly these fields:\n"
    '{\n'
    '  "tone": "one of: formal | startup-casual | technical | corporate",\n'
    '  "tone_signals": ["exact phrase from JD", "exact phrase from JD"],\n'
    '  "writing_style": "one sentence of specific guidance for writing the cover letter",\n'
    '  "vocabulary_to_use": ["word or phrase", ...5 items],\n'
    '  "vocabulary_to_avoid": ["word or phrase", ...5 items]\n'
    "}\n\n"
    "Tone definitions:\n"
    "- formal: traditional industries (law, finance, government), structured language, formal register\n"
    "- startup-casual: fast-paced culture-forward language, 'join our team', energy and enthusiasm valued\n"
    "- technical: engineering/research focused, specific technologies named, precision valued over flair\n"
    "- corporate: large company, process-driven, leadership frameworks, structured career paths\n\n"
    "Rules:\n"
    "- tone_signals: 3-5 exact quoted phrases from the JD that reveal the tone\n"
    "- writing_style: specific actionable guidance e.g. 'Lead with measurable impact, use industry terminology'\n"
    "- vocabulary_to_use: 5 words/phrases that match this tone\n"
    "- vocabulary_to_avoid: 5 words/phrases that clash with this tone"
)

_PROMPT_PREFIX = "Analyse the tone of the job description below.\n\n--- JOB DESCRIPTION ---\n"


def analyse_tone(
    job_description: str,
    user_id: Optional[int] = None,
    application_id: Optional[int] = None,
) -> dict:
    """Analyse the tone of a job description and return structured guidance."""
    from utils.sanitiser import sanitise_text
    job_description = sanitise_text(job_description, "job_description")

    logger.info("tone_agent: analysing JD tone with %s", _MODEL)
    t0 = time.monotonic()

    try:
        message = _get_client().messages.create(
            model=_MODEL,
            max_tokens=512,
            system=cached_system_prompt(_SYSTEM),
            messages=[{"role": "user", "content": f"{_PROMPT_PREFIX}{job_description[:4000]}"}],
        )
    except anthropic.APIError as exc:
        logger.error("tone_agent: API error: %s", exc)
        raise RuntimeError(f"Tone analysis failed: {exc}") from exc

    log_cache_stats(logger, "tone_agent", message.usage)
    logger.info("tone_agent: completed in %.1fs", time.monotonic() - t0)

    if user_id:
        from services.usage_service import log_api_call
        log_api_call(user_id, "tone_agent", _MODEL, message.usage, application_id)

    raw = message.content[0].text.strip()
    if not raw:
        raise RuntimeError("Tone agent returned empty response")

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("tone_agent: JSON parse failed: %s | raw: %s", exc, raw[:300])
        raise RuntimeError(f"Tone analysis parse failed: {exc}") from exc

    logger.info("tone_agent: detected tone=%s", result.get("tone", "unknown"))
    return {
        "tone": result.get("tone", "formal"),
        "tone_signals": result.get("tone_signals", []),
        "writing_style": result.get("writing_style", ""),
        "vocabulary_to_use": result.get("vocabulary_to_use", []),
        "vocabulary_to_avoid": result.get("vocabulary_to_avoid", []),
    }
