from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user_settings import (
    DatabaseSettingsResponse,
    GeneralSettingsResponse,
    PasswordSettingsResponse,
    UpdateGeneralSettingsRequest,
    UpdatePasswordSettingsRequest,
)
from app.services.user_settings_service import UserSettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/general", response_model=GeneralSettingsResponse)
def get_general_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneralSettingsResponse:
    service = UserSettingsService(db)
    return service.get_general_settings(current_user.id)


@router.patch("/general", response_model=GeneralSettingsResponse)
def update_general_settings(
    payload: UpdateGeneralSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneralSettingsResponse:
    service = UserSettingsService(db)
    return service.update_general_settings(current_user.id, payload)


@router.get("/password", response_model=PasswordSettingsResponse)
def get_password_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PasswordSettingsResponse:
    service = UserSettingsService(db)
    return service.get_password_settings(current_user.id)


@router.patch("/password", response_model=PasswordSettingsResponse)
def update_password_settings(
    payload: UpdatePasswordSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PasswordSettingsResponse:
    service = UserSettingsService(db)
    return service.update_password_settings(current_user.id, payload)


@router.get("/database", response_model=DatabaseSettingsResponse)
def get_database_settings(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatabaseSettingsResponse:
    return UserSettingsService(db).get_database_settings()
