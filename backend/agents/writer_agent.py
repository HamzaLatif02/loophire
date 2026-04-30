import json
import logging
import re
import time
from typing import List, Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("loophire.agents.writer")

_MODEL = "claude-sonnet-4-6"
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env at call time
    return _client


_CV_SYSTEM_BASE = (
    "You are an expert CV writer and career coach. "
    "You rewrite CVs to better match specific job descriptions without fabricating experience. "
    "You preserve the original structure exactly, only adjusting wording, ordering of bullets, "
    "and emphasis to highlight relevant skills.\n\n"
    "CRITICAL OUTPUT RULES:\n"
    "- Return ONLY a valid JSON object. No markdown, no code fences, no commentary before or after.\n"
    "- Preserve all github_url and live_url values exactly as provided — never invent or modify URLs.\n"
    "- Only tailor the text content (profile, bullet points, skill items). Never change the structure.\n"
    "- Every string value must be plain text — no LaTeX, no markdown."
)

_COVER_LETTER_SYSTEM_BASE = (
    "You are an expert cover letter writer. "
    "You write concise, compelling cover letters that feel personal and specific — never generic. "
    "Structure: three paragraphs only — (1) a strong hook referencing the role and why this candidate, "
    "(2) two or three concrete evidence points from the CV that match the role, "
    "(3) a confident close that references the company specifically. "
    "Return plain text only — no subject line, no date, no address block, no markdown."
)

_KNOWN_PREFERENCE_KEYS = {
    "preferred_tone",
    "target_roles",
    "target_industries",
    "writing_style",
    "seniority_level",
}


def _build_preference_block(preferences: Optional[dict]) -> str:
    if not preferences:
        return ""
    relevant = {k: v for k, v in preferences.items() if k in _KNOWN_PREFERENCE_KEYS}
    if not relevant:
        return ""
    lines = ["User preferences to apply:"]
    for key, value in relevant.items():
        label = key.replace("_", " ").capitalize()
        if isinstance(value, list):
            lines.append(f"  {label}: {', '.join(str(v) for v in value)}")
        else:
            lines.append(f"  {label}: {value}")
    return "\n".join(lines)


def _build_system(base: str, preferences: Optional[dict]) -> str:
    pref_block = _build_preference_block(preferences)
    return f"{base}\n\n{pref_block}" if pref_block else base


def _format_fit_summary(fit_analysis: dict) -> str:
    gaps = fit_analysis.get("keyword_gaps", [])
    strengths = fit_analysis.get("strengths", [])
    keywords = fit_analysis.get("jd_keywords", [])
    return (
        f"Fit score: {fit_analysis.get('fit_score', 'N/A')}/100\n"
        f"Top JD keywords: {', '.join(keywords)}\n"
        f"Keyword gaps to address (where honest): {', '.join(gaps)}\n"
        f"Existing strengths to emphasise: {', '.join(strengths)}"
    )


def _format_company_context(company_research: Optional[dict]) -> str:
    if not company_research:
        return "No company research available — infer culture and values from the job description."
    lines = ["Company research:"]
    for key, value in company_research.items():
        if isinstance(value, list):
            lines.append(f"  {key}: {', '.join(str(v) for v in value)}")
        else:
            lines.append(f"  {key}: {value}")
    return "\n".join(lines)


def _format_links_context(cv_links: Optional[List[dict]]) -> str:
    if not cv_links:
        return "No links extracted from CV."
    lines = ["Links extracted from the CV (use these exact URLs for github_url and live_url):"]
    for lk in cv_links:
        anchor = lk.get("anchor_text", "(no anchor)")
        url = lk.get("url", "")
        lines.append(f'  - anchor: "{anchor}", url: "{url}"')
    return "\n".join(lines)


def _call_claude(label: str, system_text: str, user_prompt: str, max_tokens: int) -> str:
    logger.info("writer_agent[%s]: calling %s (max_tokens=%d)", label, _MODEL, max_tokens)
    t0 = time.monotonic()

    try:
        message = _get_client().messages.create(
            model=_MODEL,
            max_tokens=max_tokens,
            system=[
                {
                    "type": "text",
                    "text": system_text,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as exc:
        logger.error(
            "writer_agent[%s]: API error after %.1fs: %s", label, time.monotonic() - t0, exc
        )
        raise RuntimeError(f"Claude API error: {exc}") from exc

    elapsed = time.monotonic() - t0
    usage = message.usage
    logger.info(
        "writer_agent[%s]: completed in %.1fs — input_tokens=%d output_tokens=%d cache_read=%d",
        label,
        elapsed,
        usage.input_tokens,
        usage.output_tokens,
        getattr(usage, "cache_read_input_tokens", 0),
    )

    result = message.content[0].text.strip()
    if not result:
        raise RuntimeError(f"Claude returned an empty response for '{label}'")
    return result


def _parse_json_response(text: str) -> dict:
    """Strip markdown code fences if present, then parse JSON."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


def _json_to_plain_text(d: dict) -> str:
    """Convert structured CV JSON to readable plain text for UI display."""
    lines = []

    if d.get("profile"):
        lines += ["PROFILE", d["profile"], ""]

    if d.get("technical_skills"):
        lines.append("TECHNICAL SKILLS")
        for s in d["technical_skills"]:
            lines.append(f"  {s.get('category', '')}: {s.get('items', '')}")
        lines.append("")

    if d.get("education"):
        lines.append("EDUCATION")
        for edu in d["education"]:
            lines.append(
                f"  {edu.get('institution', '')} — {edu.get('degree', '')} ({edu.get('dates', '')})"
            )
            for b in edu.get("highlights", []):
                lines.append(f"    • {b}")
        lines.append("")

    if d.get("experience"):
        lines.append("EXPERIENCE")
        for exp in d["experience"]:
            lines.append(
                f"  {exp.get('title', '')}, {exp.get('company', '')} ({exp.get('dates', '')})"
            )
            for b in exp.get("highlights", []):
                lines.append(f"    • {b}")
        lines.append("")

    if d.get("projects"):
        lines.append("PROJECTS")
        for proj in d["projects"]:
            lines.append(f"  {proj.get('name', '')}")
            if proj.get("github_url"):
                lines.append(f"    GitHub: {proj['github_url']}")
            for b in proj.get("highlights", []):
                lines.append(f"    • {b}")
        lines.append("")

    return "\n".join(lines).strip()


def write_application(
    cv_text: str,
    job_description: str,
    fit_analysis: dict,
    company_research: Optional[dict] = None,
    user_preferences: Optional[dict] = None,
    cv_links: Optional[List[dict]] = None,
) -> dict:
    """Rewrite a CV as structured JSON and draft a plain-text cover letter."""
    fit_summary = _format_fit_summary(fit_analysis)
    company_context = _format_company_context(company_research)
    links_context = _format_links_context(cv_links)
    cv_system = _build_system(_CV_SYSTEM_BASE, user_preferences)
    cover_system = _build_system(_COVER_LETTER_SYSTEM_BASE, user_preferences)

    cv_prompt = f"""\
Rewrite the CV below to better match the job description and return it as a JSON object.

RULES:
- Reorder or reword bullet points to bring relevant experience to the top.
- Naturally incorporate missing keywords where experience genuinely supports it — never fabricate.
- Do not add new sections or remove existing ones.
- Preserve all github_url and live_url values exactly from the links list — never invent or modify URLs.
- Every string must be plain text only (no LaTeX, no markdown).
- Return ONLY the JSON object — no markdown fences, no commentary.

JSON SCHEMA (return exactly this structure):
{{
  "profile": "tailored profile paragraph as a single string",
  "technical_skills": [
    {{"category": "category name", "items": "comma-separated items"}}
  ],
  "education": [
    {{
      "institution": "university name",
      "degree": "degree title",
      "dates": "date range e.g. Sept 2021 - June 2025",
      "highlights": ["bullet point 1", "bullet point 2"]
    }}
  ],
  "experience": [
    {{
      "title": "job title",
      "company": "company name",
      "dates": "date range",
      "highlights": ["bullet point 1", "bullet point 2"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "github_url": "exact github URL from links list, or empty string",
      "live_url": "exact live URL from links list, or empty string",
      "highlights": ["bullet point 1", "bullet point 2"]
    }}
  ]
}}

{fit_summary}

{links_context}

--- ORIGINAL CV ---
{cv_text}

--- JOB DESCRIPTION ---
{job_description}
"""

    cv_raw = _call_claude("cv", cv_system, cv_prompt, max_tokens=4096)

    try:
        tailored_cv_json = _parse_json_response(cv_raw)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error(
            "writer_agent[cv]: failed to parse JSON response: %s\nRaw (first 500 chars): %s",
            exc,
            cv_raw[:500],
        )
        raise RuntimeError(f"CV structured output parse failed: {exc}") from exc

    tailored_cv_text = _json_to_plain_text(tailored_cv_json)

    cover_prompt = f"""\
Write a cover letter for the application below.

RULES:
- Exactly 3 paragraphs: hook → evidence → close.
- The hook must name the role and explain why this candidate specifically.
- The evidence paragraph must cite 2-3 concrete, specific achievements or skills from the CV.
- The close must reference something specific about the company (culture, mission, product).
- Warm but professional tone. No clichés ("I am writing to apply…").
- Plain text only.

{fit_summary}

{company_context}

--- CV ---
{cv_text}

--- JOB DESCRIPTION ---
{job_description}
"""
    cover_letter = _call_claude("cover_letter", cover_system, cover_prompt, max_tokens=1024)

    return {
        "tailored_cv": tailored_cv_text,
        "tailored_cv_json": tailored_cv_json,
        "cover_letter": cover_letter,
    }
