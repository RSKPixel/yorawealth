from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.market_data import (
    AmfiEodSyncResponse,
    AmfiHistoricalSyncResponse,
    DailyMarketDataSyncResponse,
    ManualMarketDataSyncResponse,
    MarketDataSyncLogResponse,
    MarketDataSyncLogsResponse,
    NseEodSyncResponse,
    NseHistoricalSyncResponse,
)
from app.services.amfi_eod_sync_service import AmfiEodSyncService
from app.services.amfi_historical_sync_service import AmfiHistoricalSyncService
from app.services.market_data_sync_service import (
    MarketDataSyncService,
    run_daily_sync_background,
    serialize_sync_log,
)
from app.services.nse_eod_historical_sync_service import NseEodHistoricalSyncService
from app.services.nse_eod_sync_service import NseEodSyncService

router = APIRouter(prefix="/market-data", tags=["market-data"])


def _to_log_response(record) -> MarketDataSyncLogResponse:
    payload = serialize_sync_log(record)
    return MarketDataSyncLogResponse.model_validate(payload)


@router.post("/sync/daily", response_model=DailyMarketDataSyncResponse)
def sync_daily_market_data(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMarketDataSyncResponse:
    service = MarketDataSyncService(db)
    outcome = service.request_daily_sync(
        user_id=current_user.id,
        client_pan=current_user.client_pan,
    )

    if outcome["status"] == "started":
        background_tasks.add_task(
            run_daily_sync_background,
            log_id=outcome["log_id"],
            user_id=current_user.id,
            client_pan=current_user.client_pan,
        )

    return DailyMarketDataSyncResponse(
        status=outcome["status"],
        log_id=outcome.get("log_id"),
        message=outcome["message"],
    )


@router.post("/sync/manual", response_model=ManualMarketDataSyncResponse)
def sync_manual_market_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ManualMarketDataSyncResponse:
    service = MarketDataSyncService(db)
    outcome = service.run_manual_sync(
        user_id=current_user.id,
        client_pan=current_user.client_pan,
    )
    return ManualMarketDataSyncResponse(
        status=outcome["status"],
        log_id=outcome["log_id"],
        message=outcome["message"],
        details=outcome.get("details"),
    )


@router.get("/sync/logs", response_model=MarketDataSyncLogsResponse)
def list_market_data_sync_logs(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MarketDataSyncLogsResponse:
    service = MarketDataSyncService(db)
    outcome = service.list_logs(current_user.id, limit=limit)
    return MarketDataSyncLogsResponse(
        logs=[_to_log_response(record) for record in outcome["logs"]],
        last_daily=(
            _to_log_response(outcome["last_daily"])
            if outcome["last_daily"] is not None
            else None
        ),
    )


@router.post("/nse/eod/sync", response_model=NseEodSyncResponse)
def sync_nse_eod(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NseEodSyncResponse:
    service = NseEodSyncService(db)
    result = service.sync_latest()
    message = (
        f"NSE EOD data fetched successfully for {result['bhavdate']}. "
        f"{result['created_count']} created | {result['updated_count']} updated."
    )
    return NseEodSyncResponse(message=message, **result)


@router.post("/nse/historical/sync", response_model=NseHistoricalSyncResponse)
def sync_nse_historical(
    symbols: Optional[List[str]] = Query(None),
    period: int = Query(365, ge=1, le=3650),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NseHistoricalSyncResponse:
    service = NseEodHistoricalSyncService(db)
    resolved_symbols = service.resolve_symbols(
        symbols=symbols,
        client_pan=current_user.client_pan if not symbols else None,
    )

    effective_period = 10 if not symbols and period == 365 else period
    result = service.sync_symbols(resolved_symbols, period_days=effective_period)

    if result["errors"] and not result["rows_processed"]:
        status = "error"
        message = "Unable to download NSE historical data."
    elif result["errors"]:
        status = "partial"
        message = (
            f"NSE historical data synced for {len(result['symbols'])} symbols "
            f"with {len(result['errors'])} warnings."
        )
    else:
        status = "success"
        message = (
            f"NSE historical data synced for {len(result['symbols'])} symbols "
            f"({result['rows_processed']} rows)."
        )

    return NseHistoricalSyncResponse(
        status=status,
        message=message,
        symbols=result["symbols"],
        from_date=result["from_date"],
        to_date=result["to_date"],
        rows_processed=result["rows_processed"],
        messages=result["messages"],
        errors=result["errors"],
    )


@router.post("/amfi/eod/sync", response_model=AmfiEodSyncResponse)
def sync_amfi_eod(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AmfiEodSyncResponse:
    service = AmfiEodSyncService(db)
    result = service.sync_latest()
    message = (
        "AMFI EOD data fetched successfully. "
        f"{result['created_count']} created | {result['updated_count']} updated."
    )
    return AmfiEodSyncResponse(message=message, **result)


@router.post("/amfi/historical/sync", response_model=AmfiHistoricalSyncResponse)
def sync_amfi_historical(
    isin: Optional[str] = Query(None),
    period: int = Query(1824, ge=1, le=3650),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AmfiHistoricalSyncResponse:
    service = AmfiHistoricalSyncService(db)
    isins = [isin] if isin and isin.strip() else None
    result = service.sync_isins(
        isins=isins,
        client_pan=current_user.client_pan if not isins else None,
        period_days=period,
    )

    if result["errors"] and not result["rows_processed"]:
        status = "error"
        message = "Unable to download AMFI historical data."
    elif result["errors"]:
        status = "partial"
        message = (
            f"AMFI historical data synced for {len(result['isins'])} schemes "
            f"with {len(result['errors'])} warnings."
        )
    else:
        status = "success"
        message = (
            f"AMFI historical data synced for {len(result['isins'])} schemes "
            f"({result['rows_processed']} rows)."
        )

    return AmfiHistoricalSyncResponse(
        status=status,
        message=message,
        isins=result["isins"],
        from_date=result["from_date"],
        to_date=result["to_date"],
        rows_processed=result["rows_processed"],
        messages=result["messages"],
        errors=result["errors"],
    )
