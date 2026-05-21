from fastapi import Depends, HTTPException

from dependencies.auth_dependency import get_current_user
from models.user import User


def require_non_demo(current_user: User = Depends(get_current_user)) -> User:
    """Block demo users from destructive or expensive actions."""
    if current_user.is_demo:
        raise HTTPException(
            status_code=403,
            detail="This action is not available in demo mode. Create a free account to use all features.",
        )
    return current_user
