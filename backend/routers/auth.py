import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth_dependency import get_current_user
from models.user import User
from utils.auth import create_access_token, hash_password, verify_password
from utils.rate_limiter import LIMITS, limiter
from utils.sanitiser import _COMMON_PASSWORDS, sanitise_email

DEMO_EMAIL = "demo@loophire.xyz"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return sanitise_email(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 characters or fewer.")
        if v.lower() in _COMMON_PASSWORDS:
            raise ValueError("This password is too common. Please choose a stronger password.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return sanitise_email(v)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MeResponse(BaseModel):
    id: int
    email: str
    created_at: str


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
@limiter.limit(LIMITS["auth_register"])
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("Registered new user id=%d email=%s", user.id, user.email)
    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user={"id": user.id, "email": user.email},
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit(LIMITS["auth_login"])
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
        )

    logger.info("User id=%d logged in", user.id)
    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user={"id": user.id, "email": user.email},
    )


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at.isoformat(),
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.post("/demo")
@limiter.limit("20/minute")
def demo_login(request: Request, db: Session = Depends(get_db)):
    """Log in as the demo user instantly. Returns a 2-hour JWT flagged as demo."""
    user = db.query(User).filter(
        User.email == DEMO_EMAIL, User.is_demo == True  # noqa: E712
    ).first()

    if not user:
        raise HTTPException(
            status_code=503,
            detail="Demo account is being prepared. Please try again in a moment.",
        )

    token = create_access_token(
        user.id,
        expires_delta=timedelta(hours=2),
        extra_claims={"is_demo": True},
    )
    logger.info("Demo login issued for user_id=%d", user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "is_demo": True,
        "user": {"id": user.id, "email": user.email, "is_demo": True},
    }
