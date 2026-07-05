from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    client_pan: str = Field(min_length=10, max_length=10)
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: int
    client_pan: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    zerodha_client_id: Optional[str] = None
    profile_pic: Optional[str] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user: UserResponse
