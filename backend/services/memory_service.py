import json
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from upstash_redis import Redis

from database import SessionLocal
from models.agent_memory import AgentMemory

load_dotenv()

_PREF_TTL = 30 * 24 * 60 * 60  # 30 days in seconds
_SESSION_TTL = 60 * 60           # 1 hour in seconds


def _redis() -> Optional[Redis]:
    """Return an Upstash Redis client when env vars are present, else None."""
    if not os.getenv("UPSTASH_REDIS_REST_URL") or not os.getenv("UPSTASH_REDIS_REST_TOKEN"):
        return None
    try:
        return Redis.from_env()
    except Exception:
        return None


def _pref_key(user_id: int) -> str:
    return f"user:{user_id}:preferences"


def _session_key(user_id: int) -> str:
    return f"user:{user_id}:session"


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------

def store_preference(user_id: int, key: str, value: Any) -> None:
    """Persist a single preference key/value for a user.

    Writes to Redis (hash, 30-day TTL) and upserts an AgentMemory row in
    PostgreSQL so the preference survives a Redis flush.
    """
    r = _redis()
    if r is not None:
        try:
            redis_key = _pref_key(user_id)
            r.hset(redis_key, key, json.dumps(value))
            r.expire(redis_key, _PREF_TTL)
        except Exception:
            pass

    db = SessionLocal()
    try:
        existing = (
            db.query(AgentMemory)
            .filter(
                AgentMemory.user_id == user_id,
                AgentMemory.memory_type == "preference",
            )
            .first()
        )
        if existing:
            content = dict(existing.content)
            content[key] = value
            existing.content = content
        else:
            db.add(
                AgentMemory(
                    user_id=user_id,
                    memory_type="preference",
                    content={key: value},
                )
            )
        db.commit()
    finally:
        db.close()


def get_preferences(user_id: int) -> Dict[str, Any]:
    """Return all stored preferences for a user.

    Tries Redis first; falls back to PostgreSQL on a cache miss.
    """
    r = _redis()
    if r is not None:
        try:
            raw = r.hgetall(_pref_key(user_id))
            if raw:
                return {k: json.loads(v) for k, v in raw.items()}
        except Exception:
            pass

    db = SessionLocal()
    try:
        row = (
            db.query(AgentMemory)
            .filter(
                AgentMemory.user_id == user_id,
                AgentMemory.memory_type == "preference",
            )
            .first()
        )
        if row:
            prefs = dict(row.content)
            # Warm the cache for next time
            if r is not None:
                try:
                    redis_key = _pref_key(user_id)
                    r.hset(redis_key, mapping={k: json.dumps(v) for k, v in prefs.items()})
                    r.expire(redis_key, _PREF_TTL)
                except Exception:
                    pass
            return prefs
        return {}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

def store_session(user_id: int, session_data: Dict[str, Any]) -> None:
    """Store short-term agent session state in Redis with a 1-hour TTL.

    No-op if Redis is unavailable — session state is ephemeral by design.
    """
    r = _redis()
    if r is None:
        return
    try:
        r.set(_session_key(user_id), json.dumps(session_data), ex=_SESSION_TTL)
    except Exception:
        pass


def get_session(user_id: int) -> Dict[str, Any]:
    """Retrieve short-term agent session state from Redis.

    Returns an empty dict if Redis is unavailable or the key has expired.
    """
    r = _redis()
    if r is None:
        return {}
    try:
        raw = r.get(_session_key(user_id))
        return json.loads(raw) if raw else {}
    except (Exception, json.JSONDecodeError):
        return {}
