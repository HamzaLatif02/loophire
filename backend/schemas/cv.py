from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class CVUploadResponse(BaseModel):
    user_id: int
    cv_text: str
    characters: int
    links: List[Dict[str, Any]] = []


class CVResponse(BaseModel):
    user_id: int
    cv_text: Optional[str]
