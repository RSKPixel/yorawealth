from app.models.mutual_fund_transaction import MutualFundTransaction
from app.schemas.mutual_fund import CamsTransactionRow


def transaction_to_row(record: MutualFundTransaction) -> CamsTransactionRow:
    return CamsTransactionRow(
        client_pan=record.client_pan,
        folio=record.folio,
        fund_name=record.fund_name,
        amc=record.amc,
        assetclass=record.assetclass,
        symbol=record.symbol,
        name=record.name,
        isin=record.isin,
        transaction_date=record.transaction_date.isoformat(),
        trade_type=record.trade_type,
        nav=float(record.nav),
        quantity=float(record.quantity),
        trade_value=float(record.trade_value),
    )
