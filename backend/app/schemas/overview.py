from pydantic import BaseModel


class IndexBenchmarkPoint(BaseModel):
    month: str
    close: float


class BenchmarkSeries(BaseModel):
    id: str
    label: str
    points: list[IndexBenchmarkPoint]


class InvestmentProgressPoint(BaseModel):
    month: str
    invested_value: float
    current_value: float
    pl: float
    plp: float
    equity_value: float = 0.0
    debt_value: float = 0.0
    gold_value: float = 0.0


class InvestmentProgressResponse(BaseModel):
    mf: list[InvestmentProgressPoint]
    stocks: list[InvestmentProgressPoint]
    ppf: list[InvestmentProgressPoint]


class InvestmentProgressBenchmarksResponse(BaseModel):
    benchmarks: list[BenchmarkSeries] = []
