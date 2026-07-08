from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.overview import InvestmentProgressPoint, InvestmentProgressResponse
from app.services.investment_progress_service import InvestmentProgressService

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("/investment-progress", response_model=InvestmentProgressResponse)
def get_investment_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestmentProgressResponse:
    service = InvestmentProgressService(db)
    progress = service.build_progress(current_user.client_pan)
    return InvestmentProgressResponse(
        mf=[
            InvestmentProgressPoint(
                month=point.month,
                invested_value=point.invested_value,
                current_value=point.current_value,
                pl=point.pl,
                plp=point.plp,
            )
            for point in progress["mf"]
        ],
        stocks=[
            InvestmentProgressPoint(
                month=point.month,
                invested_value=point.invested_value,
                current_value=point.current_value,
                pl=point.pl,
                plp=point.plp,
            )
            for point in progress["stocks"]
        ],
        ppf=[
            InvestmentProgressPoint(
                month=point.month,
                invested_value=point.invested_value,
                current_value=point.current_value,
                pl=point.pl,
                plp=point.plp,
            )
            for point in progress["ppf"]
        ],
    )
