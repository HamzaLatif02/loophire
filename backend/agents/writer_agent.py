import logging
import os
import time
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("loophire.agents.writer")

_MODEL = "claude-opus-4-7"
_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env at call time
    return _client

_CV_SYSTEM_BASE = (
    "You are an expert CV writer and career coach. "
    "You rewrite CVs to better match specific job descriptions without fabricating experience. "
    "You preserve the original structure and format exactly, only adjusting wording, ordering of bullets, "
    "and emphasis to highlight relevant skills. Return plain text only — no markdown, no commentary."
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


def _call_claude(label: str, system_text: str, user_prompt: str, max_tokens: int) -> str:
    logger.info("writer_agent[%s]: calling %s (max_tokens=%d)", label, _MODEL, max_tokens)
    t0 = time.monotonic()

    try:
        with _get_client().messages.stream(
            model=_MODEL,
            max_tokens=max_tokens,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": system_text,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            message = stream.get_final_message()
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

    text_blocks = [block.text for block in message.content if block.type == "text"]
    return "\n".join(text_blocks).strip()


def write_application(
    cv_text: str,
    job_description: str,
    fit_analysis: dict,
    company_research: Optional[dict] = None,
    user_preferences: Optional[dict] = None,
) -> dict:
    """Rewrite a CV and draft a cover letter tailored to a specific role."""
    fit_summary = _format_fit_summary(fit_analysis)
    company_context = _format_company_context(company_research)
    cv_system = _build_system(_CV_SYSTEM_BASE, user_preferences)
    cover_system = _build_system(_COVER_LETTER_SYSTEM_BASE, user_preferences)

    cv_prompt = f"""\
Rewrite the CV below to better match the job description.

RULES:
- Keep the exact same sections and structure as the original CV.
- Reorder or reword bullet points to bring relevant experience to the top.
- Naturally incorporate missing keywords where the experience genuinely supports it — never fabricate.
- Do not add new sections or remove existing ones.
- Return the full rewritten CV as plain text.

{fit_summary}

--- ORIGINAL CV ---
{cv_text}

--- JOB DESCRIPTION ---
{job_description}
"""
    tailored_cv = _call_claude("cv", cv_system, cv_prompt, max_tokens=4096)

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

    return {"tailored_cv": tailored_cv, "cover_letter": cover_letter}
