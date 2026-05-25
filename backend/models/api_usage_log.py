from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from database import Base


class APIUsageLog(Base):
    __tablename__ = "api_usage_logs"

    id                    = Column(Integer, primary_key=True)
    user_id               = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at            = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    agent_name            = Column(String, nullable=False)
    model                 = Column(String, nullable=False)

    input_tokens          = Column(Integer, default=0)
    output_tokens         = Column(Integer, default=0)
    cache_creation_tokens = Column(Integer, default=0)
    cache_read_tokens     = Column(Integer, default=0)

    application_id        = Column(Integer, ForeignKey("applications.id"), nullable=True)
