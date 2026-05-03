import json
import logging
import re
import time
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

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
    "You always respond with valid JSON only — no markdown fences, no prose outside the JSON object."
)

_USER_TEMPLATE = """\
Generate interview preparation questions for a candidate applying to the role described below.

Return ONLY a JSON object with exactly this structure:
{{
  "technical": [
    {{"question": "<specific technical question>", "framework": "<suggested answer guidance>"}},
    {{"question": "<specific technical question>", "framework": "<suggested answer guidance>"}},
    {{"question": "<specific technical question>", "framework": "<suggested answer guidance>"}},
    {{"question": "<specific technical question>", "framework": "<suggested answer guidance>"}},
    {{"question": "<specific technical question>", "framework": "<suggested answer guidance>"}}
  ],
  "behavioural": [
    {{"question": "<behavioural question based on JD values>", "framework": "<STAR method: Situation, Task, Action, Result>"}},
    {{"question": "<behavioural question based on JD values>", "framework": "<STAR method: Situation, Task, Action, Result>"}},
    {{"question": "<behavioural question based on JD values>", "framework": "<STAR method: Situation, Task, Action, Result>"}}
  ],
  "cv_based": [
    {{"question": "<question probing a specific experience from the CV>", "framework": "<talking points based on their background>"}},
    {{"question": "<question probing a specific experience from the CV>", "framework": "<talking points based on their background>"}},
    {{"question": "<question probing a specific experience from the CV>", "framework": "<talking points based on their background>"}}
  ]
}}

Rules:
- Technical questions must target specific technologies, architectures, and responsibilities in the JD
- Behavioural questions must reference the values and working style implied by the JD
- CV-based questions must reference specific projects, roles, or achievements visible in the CV
- Each framework should be 2-4 sentences guiding how to structure and what to include in the answer
- Do not repeat questions across categories

--- JOB DESCRIPTION ---
{job_description}

--- CANDIDATE CV ---
{cv_text}
"""


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def generate_interview_prep(job_description: str, cv_text: str) -> dict:
    """Generate structured interview questions for a role/CV combination."""
    prompt = _USER_TEMPLATE.format(job_description=job_description, cv_text=cv_text)

    logger.info("interview_agent: calling %s", _MODEL)
    t0 = time.monotonic()

    try:
        response = _get_client().messages.create(
            model=_MODEL,
            max_tokens=2048,
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
        logger.error("interview_agent: API error after %.1fs: %s", time.monotonic() - t0, exc)
        raise RuntimeError(f"Claude API error: {exc}") from exc

    elapsed = time.monotonic() - t0
    usage = response.usage
    logger.info(
        "interview_agent: completed in %.1fs — input_tokens=%d output_tokens=%d",
        elapsed,
        usage.input_tokens,
        usage.output_tokens,
    )

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
