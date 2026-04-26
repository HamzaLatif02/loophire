from typing import Optional
from pydantic import BaseModel


class CVUploadResponse(BaseModel):
    user_id: int
    cv_text: str
    characters: int


class CVResponse(BaseModel):
    user_id: int
    cv_text: Optional[str]
