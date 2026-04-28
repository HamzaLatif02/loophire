from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/loophire")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,          # drop & replace stale connections silently
    connect_args={"connect_timeout": 10},  # fail fast instead of hanging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
