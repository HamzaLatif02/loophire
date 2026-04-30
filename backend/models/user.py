from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    base_cv_text = Column(Text, nullable=True)
    cv_links = Column(JSON, nullable=True)   # [{"url": str, "page": int}]
    preferences = Column(JSON, nullable=True)

    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("AgentMemory", back_populates="user", cascade="all, delete-orphan")
