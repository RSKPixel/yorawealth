from typing import Optional

from pydantic import BaseModel, Field


class GeneralSettingsResponse(BaseModel):
    bank_statement_normalization_prompt: str


class UpdateGeneralSettingsRequest(BaseModel):
    bank_statement_normalization_prompt: str = Field(..., min_length=1, max_length=20000)
