from dataclasses import asdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.overview import (
    BenchmarkSeries,
    IndexBenchmarkPoint,
    InvestmentProgressBenchmarksResponse,
    InvestmentProgressPoint,
    InvestmentProgressResponse,
)
from app.services.investment_progress_service import InvestmentProgressService

router = APIRouter(prefix="/overview", tags=["overview"])


def _to_progress_point(point) -> InvestmentProgressPoint:
    return InvestmentProgressPoint.model_validate(asdict(point))


def _to_benchmark_point(point) -> IndexBenchmarkPoint:
    return IndexBenchmarkPoint.model_validate(asdict(point))


def _to_benchmark_series(series) -> BenchmarkSeries:
    return BenchmarkSeries(
        id=series.id,
        label=series.label,
        points=[_to_benchmark_point(point) for point in series.points],
    )


@router.get("/investment-progress", response_model=InvestmentProgressResponse)
def get_investment_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestmentProgressResponse:
    service = InvestmentProgressService(db)
    progress = service.build_progress(current_user.client_pan)
    return InvestmentProgressResponse(
        mf=[_to_progress_point(point) for point in progress["mf"]],
        stocks=[_to_progress_point(point) for point in progress["stocks"]],
        ppf=[_to_progress_point(point) for point in progress["ppf"]],
    )


@router.get(
    "/investment-progress/benchmarks",
    response_model=InvestmentProgressBenchmarksResponse,
)
def get_investment_progress_benchmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestmentProgressBenchmarksResponse:
    service = InvestmentProgressService(db)
    benchmarks = service.build_benchmarks(current_user.client_pan)
    return InvestmentProgressBenchmarksResponse(
        benchmarks=[_to_benchmark_series(series) for series in benchmarks],
    )
