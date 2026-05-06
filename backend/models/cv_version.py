from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from database import Base


class CVVersion(Base):
    __tablename__ = "cv_versions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name       = Column(String, nullable=False)
    cv_text    = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")

    user = relationship("User", back_populates="cv_versions")
