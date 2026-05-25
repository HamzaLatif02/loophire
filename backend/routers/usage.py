from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth_dependency import get_current_user
from models.api_usage_log import APIUsageLog
from models.application import Application
from models.user import User
from services.usage_service import calculate_cost

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("")
def get_usage_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    all_logs = (
        db.query(APIUsageLog)
        .filter(APIUsageLog.user_id == current_user.id)
        .all()
    )

    total_calls           = len(all_logs)
    total_input_tokens    = sum(l.input_tokens for l in all_logs)
    total_output_tokens   = sum(l.output_tokens for l in all_logs)
    total_cache_creation  = sum(l.cache_creation_tokens for l in all_logs)
    total_cache_read      = sum(l.cache_read_tokens for l in all_logs)

    total_actual_cost = 0.0
    total_full_cost   = 0.0
    for log in all_logs:
        costs = calculate_cost(
            log.input_tokens, log.output_tokens,
            log.cache_creation_tokens, log.cache_read_tokens,
            log.model,
        )
        total_actual_cost += costs["actual_cost"]
        total_full_cost   += costs["full_cost"]

    total_savings = total_full_cost - total_actual_cost
    savings_pct   = (total_savings / total_full_cost * 100) if total_full_cost > 0 else 0

    month_logs = [l for l in all_logs if l.created_at >= month_start]
    month_calls = len(month_logs)

    month_actual = 0.0
    month_full   = 0.0
    for log in month_logs:
        costs = calculate_cost(
            log.input_tokens, log.output_tokens,
            log.cache_creation_tokens, log.cache_read_tokens,
            log.model,
        )
        month_actual += costs["actual_cost"]
        month_full   += costs["full_cost"]

    total_apps = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.fit_score.isnot(None))
        .count()
    )

    month_apps = (
        db.query(Application)
        .filter(
            Application.user_id == current_user.id,
            Application.fit_score.isnot(None),
            Application.created_at >= month_start,
        )
        .count()
    )

    agent_stats: dict = {}
    for log in all_logs:
        if log.agent_name not in agent_stats:
            agent_stats[log.agent_name] = {"calls": 0, "input_tokens": 0, "output_tokens": 0}
        agent_stats[log.agent_name]["calls"]         += 1
        agent_stats[log.agent_name]["input_tokens"]  += log.input_tokens
        agent_stats[log.agent_name]["output_tokens"] += log.output_tokens

    thirty_days_ago = now - timedelta(days=30)
    recent_logs = [l for l in all_logs if l.created_at >= thirty_days_ago]
    daily_map: dict = {}
    for log in recent_logs:
        day = log.created_at.strftime("%Y-%m-%d")
        daily_map[day] = daily_map.get(day, 0) + 1

    daily_series = [
        {
            "date":  (now - timedelta(days=29 - i)).strftime("%Y-%m-%d"),
            "calls": daily_map.get((now - timedelta(days=29 - i)).strftime("%Y-%m-%d"), 0),
        }
        for i in range(30)
    ]

    cache_hit_rate = (
        total_cache_read / max(total_cache_read + total_input_tokens, 1) * 100
    )

    return {
        "all_time": {
            "total_api_calls":       total_calls,
            "total_input_tokens":    total_input_tokens,
            "total_output_tokens":   total_output_tokens,
            "total_tokens":          total_input_tokens + total_output_tokens,
            "cache_creation_tokens": total_cache_creation,
            "cache_read_tokens":     total_cache_read,
            "actual_cost_usd":       round(total_actual_cost, 4),
            "full_cost_usd":         round(total_full_cost, 4),
            "savings_usd":           round(total_savings, 4),
            "savings_pct":           round(savings_pct, 1),
            "total_applications":    total_apps,
            "cache_hit_rate":        round(cache_hit_rate, 1),
        },
        "this_month": {
            "api_calls":       month_calls,
            "actual_cost_usd": round(month_actual, 4),
            "savings_usd":     round(month_full - month_actual, 4),
            "applications":    month_apps,
        },
        "agent_breakdown": [
            {
                "agent":         name,
                "calls":         stats["calls"],
                "input_tokens":  stats["input_tokens"],
                "output_tokens": stats["output_tokens"],
            }
            for name, stats in sorted(agent_stats.items(), key=lambda x: -x[1]["calls"])
        ],
        "daily_activity": daily_series,
        "pricing_note": (
            "Costs are estimates based on Anthropic published pricing. "
            "Actual billing may differ."
        ),
    }
