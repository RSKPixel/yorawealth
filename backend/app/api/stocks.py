from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.stocks import (
    ManualTradeCreate,
    ManualTradeResponse,
    StockHoldingsResponse,
    StockTransactionsResponse,
    TradebookUploadResponse,
)
from app.services.stocks_service import StocksService

router = APIRouter(prefix="/stocks", tags=["stocks"])


def get_stocks_service(db: Session = Depends(get_db)) -> StocksService:
    upload_dir = Path(settings.upload_dir) / "tradebooks"
    upload_dir.mkdir(parents=True, exist_ok=True)
    return StocksService(db, upload_dir)


@router.get("/holdings", response_model=StockHoldingsResponse)
def list_stock_holdings(
    current_user: User = Depends(get_current_user),
    service: StocksService = Depends(get_stocks_service),
) -> StockHoldingsResponse:
    return service.list_holdings(current_user.client_pan)


@router.get("/transactions", response_model=StockTransactionsResponse)
def list_stock_transactions(
    current_user: User = Depends(get_current_user),
    service: StocksService = Depends(get_stocks_service),
) -> StockTransactionsResponse:
    return service.list_transactions(current_user.client_pan)


@router.post("/transactions/manual", response_model=ManualTradeResponse)
def create_manual_trade(
    payload: ManualTradeCreate,
    current_user: User = Depends(get_current_user),
    service: StocksService = Depends(get_stocks_service),
) -> ManualTradeResponse:
    return service.create_manual_trade(current_user.id, payload)


@router.put("/transactions/manual/{trade_id}", response_model=ManualTradeResponse)
def update_manual_trade(
    trade_id: str,
    payload: ManualTradeCreate,
    current_user: User = Depends(get_current_user),
    service: StocksService = Depends(get_stocks_service),
) -> ManualTradeResponse:
    return service.update_manual_trade(current_user.id, trade_id, payload)


@router.delete("/transactions/manual/{trade_id}", response_model=ManualTradeResponse)
def delete_manual_trade(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    service: StocksService = Depends(get_stocks_service),
) -> ManualTradeResponse:
    return service.delete_manual_trade(current_user.id, trade_id)


@router.post("/tradebook/upload", response_model=TradebookUploadResponse)
async def upload_tradebook(
    file: UploadFile = File(...),
    broker: str = Form(...),
    current_user: User = Depends(get_current_user),
    service: StocksService = Depends(get_stocks_service),
) -> TradebookUploadResponse:
    return await service.upload_tradebook(current_user.id, file, broker)
