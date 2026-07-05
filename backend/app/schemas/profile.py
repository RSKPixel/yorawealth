from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_PATTERN = re.compile(r"^[0-9+\-\s()]{7,20}$")
ZERODHA_CLIENT_ID_PATTERN = re.compile(r"^[A-Z]{2}\d{4}$")


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)
    zerodha_client_id: Optional[str] = Field(default=None, max_length=16)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not EMAIL_PATTERN.match(cleaned):
            raise ValueError("Enter a valid email address.")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not PHONE_PATTERN.match(cleaned):
            raise ValueError("Enter a valid phone number.")
        return cleaned

    @field_validator("zerodha_client_id")
    @classmethod
    def validate_zerodha_client_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().upper()
        if not cleaned:
            return None
        if not ZERODHA_CLIENT_ID_PATTERN.match(cleaned):
            raise ValueError("Enter a valid Zerodha client ID (e.g. WI0911).")
        return cleaned

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name is required.")
        return cleaned


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
