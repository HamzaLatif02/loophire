from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator

from models.application import ApplicationStatus
from utils.sanitiser import check_prompt_injection, sanitise_text, sanitise_url


RESPONSE_TYPES = ["recruiter screen", "technical interview", "rejection", "offer"]


class ApplicationGenerateRequest(BaseModel):
    job_title: str
    company_name: str
    job_description: str
    cv_version_id: Optional[int] = None

    @field_validator("job_title")
    @classmethod
    def validate_job_title(cls, v: str) -> str:
        v = sanitise_text(v, "job_title")
        if len(v) < 2:
            raise ValueError("Job title must be at least 2 characters.")
        return v

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v: str) -> str:
        v = sanitise_text(v, "company_name")
        if len(v) < 2:
            raise ValueError("Company name must be at least 2 characters.")
        return v

    @field_validator("job_description")
    @classmethod
    def validate_job_description(cls, v: str) -> str:
        v = sanitise_text(v, "job_description")
        if len(v) < 50:
            raise ValueError(
                "Job description is too short. "
                "Please paste the full job description (at least 50 characters)."
            )
        check_prompt_injection(v, "job description")
        return v


class ScrapeJobRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        return sanitise_url(v)


class ApplicationSummary(BaseModel):
    id: int
    job_title: str
    company_name: str
    fit_score: Optional[float]
    status: ApplicationStatus
    created_at: datetime
    interview_date: Optional[datetime] = None
    got_response: bool = False
    response_type: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationDetail(BaseModel):
    id: int
    user_id: int
    job_title: str
    company_name: str
    job_description: Optional[str]
    fit_score: Optional[float]
    tailored_cv: Optional[str]
    tailored_cv_json: Optional[Dict[str, Any]] = None
    cover_letter: Optional[str]
    keyword_gaps: Optional[List[Any]]
    company_research: Optional[Dict[str, Any]]
    status: ApplicationStatus
    notes: Optional[str]
    interview_date: Optional[datetime] = None
    interview_notes: Optional[str] = None
    got_response: bool = False
    response_date: Optional[datetime] = None
    response_type: Optional[str] = None
    interview_prep: Optional[Dict[str, Any]] = None
    tone_analysis: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationPatchRequest(BaseModel):
    tailored_cv_json: Optional[Dict[str, Any]] = None
    cover_letter: Optional[str] = None

    @field_validator("cover_letter")
    @classmethod
    def validate_cover_letter(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return sanitise_text(v, "cover_letter")


class InterviewUpdateRequest(BaseModel):
    interview_date: Optional[datetime] = None
    interview_notes: Optional[str] = None

    @field_validator("interview_notes")
    @classmethod
    def validate_interview_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return sanitise_text(v, "notes")


class ResponseUpdateRequest(BaseModel):
    got_response: bool
    response_type: Optional[str] = None

    @field_validator("response_type")
    @classmethod
    def validate_response_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in RESPONSE_TYPES:
            raise ValueError(f"Response type must be one of: {', '.join(RESPONSE_TYPES)}")
        return v


class AnalyticsResponse(BaseModel):
    total_applications: int
    response_rate: float
    avg_fit_score_with_response: Optional[float]
    avg_fit_score_without_response: Optional[float]
    response_by_type: Dict[str, int]
    top_keywords_in_successful_apps: List[str]
