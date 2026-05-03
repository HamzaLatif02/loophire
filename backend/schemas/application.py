from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from models.application import ApplicationStatus


RESPONSE_TYPES = ["recruiter screen", "technical interview", "rejection", "offer"]


class ApplicationGenerateRequest(BaseModel):
    user_id: int
    job_title: str
    company_name: str
    job_description: str


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
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationPatchRequest(BaseModel):
    tailored_cv_json: Optional[Dict[str, Any]] = None
    cover_letter: Optional[str] = None


class InterviewUpdateRequest(BaseModel):
    interview_date: Optional[datetime] = None
    interview_notes: Optional[str] = None


class ResponseUpdateRequest(BaseModel):
    got_response: bool
    response_type: Optional[str] = None


class AnalyticsResponse(BaseModel):
    total_applications: int
    response_rate: float
    avg_fit_score_with_response: Optional[float]
    avg_fit_score_without_response: Optional[float]
    response_by_type: Dict[str, int]
    top_keywords_in_successful_apps: List[str]
