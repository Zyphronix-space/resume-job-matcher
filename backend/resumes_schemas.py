"""Pydantic schemas for candidate resume metadata (never the raw file/text)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    version: int
    is_active: bool
    cv_skills: list[str]
    resume_sections: dict[str, bool]
    resume_structure_score: float
    uploaded_at: datetime
