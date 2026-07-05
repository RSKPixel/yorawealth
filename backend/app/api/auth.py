from __future__ import annotations

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.cookies import clear_auth_cookie, set_auth_cookie
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.schemas.profile import ChangePasswordRequest, UpdateProfileRequest
from app.services.auth_service import AuthService
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    auth_service = AuthService(db)
    result = auth_service.login(payload)
    set_auth_cookie(response, result.access_token)
    return LoginResponse(user=result.user)


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    clear_auth_cookie(response)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/profile", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    profile_service = ProfileService(db)
    return profile_service.update_profile(current_user.id, payload)


@router.patch("/profile/password", response_model=UserResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    profile_service = ProfileService(db)
    return profile_service.change_password(current_user.id, payload)


@router.post("/profile/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    profile_service = ProfileService(db)
    return await profile_service.upload_profile_photo(current_user.id, file)
