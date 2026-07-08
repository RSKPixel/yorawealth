from pydantic import BaseModel


class InvestmentProgressPoint(BaseModel):
    month: str
    invested_value: float
    current_value: float
    pl: float
    plp: float


class InvestmentProgressResponse(BaseModel):
    mf: list[InvestmentProgressPoint]
    stocks: list[InvestmentProgressPoint]
    ppf: list[InvestmentProgressPoint]
