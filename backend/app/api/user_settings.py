from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user_settings import (
    GeneralSettingsResponse,
    UpdateGeneralSettingsRequest,
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
