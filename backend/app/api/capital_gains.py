from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.capital_gains import (
    CapitalGainCreate,
    CapitalGainDeleteResponse,
    CapitalGainResponse,
    CapitalGainUpdate,
    RealizedGainsResponse,
)
from app.services.capital_gains_service import CapitalGainsService

router = APIRouter(prefix="/capital-gains", tags=["capital-gains"])


def get_capital_gains_service(db: Session = Depends(get_db)) -> CapitalGainsService:
    return CapitalGainsService(db)


@router.get("/realized", response_model=RealizedGainsResponse)
def list_realized_gains(
    current_user: User = Depends(get_current_user),
    service: CapitalGainsService = Depends(get_capital_gains_service),
) -> RealizedGainsResponse:
    return service.list_realized_gains(current_user.client_pan)


@router.get("/{record_id}", response_model=CapitalGainResponse)
def get_capital_gain(
    record_id: int,
    current_user: User = Depends(get_current_user),
    service: CapitalGainsService = Depends(get_capital_gains_service),
) -> CapitalGainResponse:
    return service.get_capital_gain(current_user.client_pan, record_id)


@router.post("", response_model=CapitalGainResponse)
def create_capital_gain(
    payload: CapitalGainCreate,
    current_user: User = Depends(get_current_user),
    service: CapitalGainsService = Depends(get_capital_gains_service),
) -> CapitalGainResponse:
    return service.create_capital_gain(current_user.client_pan, payload)


@router.put("/{record_id}", response_model=CapitalGainResponse)
def update_capital_gain(
    record_id: int,
    payload: CapitalGainUpdate,
    current_user: User = Depends(get_current_user),
    service: CapitalGainsService = Depends(get_capital_gains_service),
) -> CapitalGainResponse:
    return service.update_capital_gain(current_user.client_pan, record_id, payload)


@router.delete("/{record_id}", response_model=CapitalGainDeleteResponse)
def delete_capital_gain(
    record_id: int,
    current_user: User = Depends(get_current_user),
    service: CapitalGainsService = Depends(get_capital_gains_service),
) -> CapitalGainDeleteResponse:
    return service.delete_capital_gain(current_user.client_pan, record_id)
