from __future__ import annotations

import re
from typing import Optional

ASSET_CLASSES = ("Equity", "Debt", "Gold")

# NSE/BSE/Zerodha sovereign gold bond symbols, e.g. SGBFEB32, SGBFEB32IV-GB
SGB_SYMBOL_PATTERN = re.compile(r"^SGB", re.IGNORECASE)
# RBI sovereign gold bond ISIN prefix
SGB_ISIN_PREFIX = "IN0020"


def normalize_stock_symbol(symbol: str) -> str:
    value = symbol.strip().upper()
    if "-" in value:
        value = value.split("-", 1)[0]
    return value


def classify_stock(
    symbol: str,
    isin: Optional[str] = None,
    name: Optional[str] = None,
) -> str:
    normalized_symbol = normalize_stock_symbol(symbol)
    if SGB_SYMBOL_PATTERN.match(normalized_symbol):
        return "Gold"

    if isin:
        isin_upper = isin.strip().upper()
        if isin_upper.startswith(SGB_ISIN_PREFIX):
            return "Gold"

    if name:
        name_upper = name.upper()
        if "SOVEREIGN GOLD BOND" in name_upper or " GOLD BOND" in name_upper:
            return "Gold"

    return "Equity"
