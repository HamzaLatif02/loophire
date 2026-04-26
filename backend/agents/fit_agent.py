import json
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_SYSTEM_PROMPT = (
    "You are an expert technical recruiter and career coach. "
    "You analyse CVs against job descriptions with precision and objectivity. "
    "You always respond with valid JSON only — no markdown fences, no prose outside the JSON object."
)

_USER_TEMPLATE = """\
Analyse the fit between the CV and the job description below.

Return ONLY a JSON object with exactly these fields:
{{
  "fit_score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>",
  "jd_keywords": [<top 10 keywords/skills extracted from the job description>],
  "keyword_gaps": [<keywords from jd_keywords that are missing or weak in the CV>],
  "strengths": [<3-5 specific strengths from the CV that match the role>]
}}

--- CV ---
{cv_text}

--- JOB DESCRIPTION ---
{job_description}
"""


def _strip_fences(text: str) -> str:
    """Remove markdown code fences if Claude wraps the JSON despite instructions."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def analyse_fit(cv_text: str, job_description: str) -> dict:
    """Score a CV against a job description and return structured analysis."""
    prompt = _USER_TEMPLATE.format(cv_text=cv_text, job_description=job_description)

    try:
        response = _client.messages.create(
            model="claude-sonnet-4-20250514",
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
        raise RuntimeError(f"Claude API error: {exc}") from exc

    raw = response.content[0].text
    cleaned = _strip_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Claude returned invalid JSON: {exc}\nRaw response: {raw}") from exc

    return result
