from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from models.application import ApplicationStatus


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
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationPatchRequest(BaseModel):
    tailored_cv_json: Optional[Dict[str, Any]] = None
    cover_letter: Optional[str] = None
