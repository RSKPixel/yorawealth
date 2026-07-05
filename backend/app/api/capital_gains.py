from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.capital_gains import RealizedGainsResponse
from app.services.realized_gains_service import RealizedGainsService

router = APIRouter(prefix="/capital-gains", tags=["capital-gains"])


@router.get("/realized", response_model=RealizedGainsResponse)
def list_realized_gains(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RealizedGainsResponse:
    service = RealizedGainsService(db)
    return service.list_realized_gains(current_user.client_pan)
