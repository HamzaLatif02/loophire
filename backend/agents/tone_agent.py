import json
import logging
import re
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

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
    "tone and style. Return ONLY a valid JSON object — no markdown fences, no commentary."
)

_PROMPT = """\
Analyse the tone of the job description below and return a JSON object with exactly these fields:

{{
  "tone": "one of: formal | startup-casual | technical | corporate",
  "tone_signals": ["exact phrase from JD", "exact phrase from JD"],
  "writing_style": "one sentence of specific guidance for writing the cover letter",
  "vocabulary_to_use": ["word or phrase", "word or phrase", "word or phrase", "word or phrase", "word or phrase"],
  "vocabulary_to_avoid": ["word or phrase", "word or phrase", "word or phrase", "word or phrase", "word or phrase"]
}}

Tone definitions:
- formal: traditional industries (law, finance, government), structured language, formal register
- startup-casual: fast-paced culture-forward language, "join our team", energy and enthusiasm valued
- technical: engineering/research focused, specific technologies named, precision valued over flair
- corporate: large company, process-driven, leadership frameworks, structured career paths

Rules:
- tone_signals: 3-5 exact quoted phrases from the JD that reveal the tone
- writing_style: specific actionable guidance e.g. "Lead with measurable impact, use industry terminology, keep enthusiasm professional"
- vocabulary_to_use: 5 words/phrases that match this tone
- vocabulary_to_avoid: 5 words/phrases that clash with this tone

--- JOB DESCRIPTION ---
{job_description}
"""


def analyse_tone(job_description: str) -> dict:
    """Analyse the tone of a job description and return structured guidance."""
    prompt = _PROMPT.format(job_description=job_description[:4000])
    logger.info("tone_agent: analysing JD tone with %s", _MODEL)

    try:
        message = _get_client().messages.create(
            model=_MODEL,
            max_tokens=512,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        logger.error("tone_agent: API error: %s", exc)
        raise RuntimeError(f"Tone analysis failed: {exc}") from exc

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
