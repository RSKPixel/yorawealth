from app.models.portfolio_holding import PortfolioHolding
from app.schemas.mutual_fund import PortfolioHoldingRow


def holding_to_row(record: PortfolioHolding) -> PortfolioHoldingRow:
    return PortfolioHoldingRow(
        client_pan=record.client_pan,
        folio=record.folio,
        isin=record.isin,
        fund_name=record.fund_name,
        amc=record.amc,
        quantity=float(record.quantity),
        invested_amount=float(record.invested_amount),
        avg_cost=float(record.avg_cost),
        current_nav=float(record.current_nav),
        current_value=float(record.current_value),
        unrealized_gain=float(record.unrealized_gain),
    )
