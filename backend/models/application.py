import enum
from sqlalchemy import (
    Column, Integer, String, Text, Float, JSON,
    DateTime, ForeignKey, Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    applied = "applied"
    interviewing = "interviewing"
    rejected = "rejected"
    offer = "offer"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    job_title = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    job_description = Column(Text, nullable=True)

    fit_score = Column(Float, nullable=True)
    tailored_cv = Column(Text, nullable=True)
    tailored_cv_json = Column(JSON, nullable=True)
    cover_letter = Column(Text, nullable=True)
    keyword_gaps = Column(JSON, nullable=True)
    company_research = Column(JSON, nullable=True)

    status = Column(
        Enum(ApplicationStatus, name="applicationstatus"),
        nullable=False,
        default=ApplicationStatus.draft,
    )
    notes = Column(Text, nullable=True)
    interview_date = Column(DateTime(timezone=True), nullable=True)
    interview_notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="applications")
