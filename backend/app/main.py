from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.bank_transactions import router as bank_transactions_router
from app.api.banks import router as banks_router
from app.api.capital_gains import router as capital_gains_router
from app.api.market_data import router as market_data_router
from app.api.mutual_fund import router as mutual_fund_router
from app.api.overview import router as overview_router
from app.api.ppf import router as ppf_router
from app.api.stocks import router as stocks_router
from app.api.user_settings import router as user_settings_router
from app.core.config import settings
from app.services.bank_statement_service import purge_bank_statement_uploads

app = FastAPI(title=settings.app_name, debug=settings.debug)

upload_path = Path(settings.upload_dir)
if not upload_path.is_absolute():
    upload_path = Path(__file__).resolve().parent.parent / upload_path
upload_path.mkdir(parents=True, exist_ok=True)
(upload_path / "cams").mkdir(parents=True, exist_ok=True)
(upload_path / "tradebooks").mkdir(parents=True, exist_ok=True)
(upload_path / "ppf").mkdir(parents=True, exist_ok=True)
(upload_path / "bank").mkdir(parents=True, exist_ok=True)
purge_bank_statement_uploads(upload_path / "bank")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(banks_router, prefix="/api")
app.include_router(bank_transactions_router, prefix="/api")
app.include_router(capital_gains_router, prefix="/api")
app.include_router(market_data_router, prefix="/api")
app.include_router(mutual_fund_router, prefix="/api")
app.include_router(overview_router, prefix="/api")
app.include_router(ppf_router, prefix="/api")
app.include_router(stocks_router, prefix="/api")
app.include_router(user_settings_router, prefix="/api")
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")
