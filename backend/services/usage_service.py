import logging
from typing import Optional

logger = logging.getLogger("loophire.services.usage")

# Anthropic pricing per million tokens (as of 2025)
PRICING = {
    "claude-sonnet-4-6": {
        "input":       3.00,
        "output":     15.00,
        "cache_write": 3.75,
        "cache_read":  0.30,
    },
    "claude-haiku-4-5-20251001": {
        "input":       1.00,
        "output":      5.00,
        "cache_write": 1.25,
        "cache_read":  0.10,
    },
}

DEFAULT_PRICING = {
    "input":       3.00,
    "output":     15.00,
    "cache_write": 3.75,
    "cache_read":  0.30,
}


def log_api_call(
    user_id: int,
    agent_name: str,
    model: str,
    usage,
    application_id: Optional[int] = None,
) -> None:
    """
    Log a Claude API call to the database.
    Opens its own session so it never interferes with the caller's transaction.
    Never raises — logging failures must not break the generation pipeline.
    """
    if not user_id:
        return
    try:
        from database import SessionLocal
        from models.api_usage_log import APIUsageLog

        db = SessionLocal()
        try:
            log = APIUsageLog(
                user_id=user_id,
                agent_name=agent_name,
                model=model,
                input_tokens=getattr(usage, "input_tokens", 0) or 0,
                output_tokens=getattr(usage, "output_tokens", 0) or 0,
                cache_creation_tokens=getattr(usage, "cache_creation_input_tokens", 0) or 0,
                cache_read_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
                application_id=application_id,
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.warning("Failed to log API usage: %s", e)
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        logger.warning("Usage logging skipped: %s", e)


def calculate_cost(
    input_tokens: int,
    output_tokens: int,
    cache_creation_tokens: int,
    cache_read_tokens: int,
    model: str,
) -> dict:
    pricing = PRICING.get(model, DEFAULT_PRICING)

    actual = (
        (input_tokens          / 1_000_000) * pricing["input"] +
        (output_tokens         / 1_000_000) * pricing["output"] +
        (cache_creation_tokens / 1_000_000) * pricing["cache_write"] +
        (cache_read_tokens     / 1_000_000) * pricing["cache_read"]
    )

    full = (
        (input_tokens          / 1_000_000) * pricing["input"] +
        (output_tokens         / 1_000_000) * pricing["output"] +
        (cache_creation_tokens / 1_000_000) * pricing["input"] +
        (cache_read_tokens     / 1_000_000) * pricing["input"]
    )

    return {
        "actual_cost": round(actual, 6),
        "full_cost":   round(full,   6),
        "savings":     round(full - actual, 6),
        "savings_pct": round(((full - actual) / full * 100) if full > 0 else 0, 1),
    }
