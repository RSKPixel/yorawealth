from __future__ import annotations

BUY_LIKE_TRADE_TYPES = frozenset({"BUY", "BUY BACK", "IPO"})
SELL_TRADE_TYPES = frozenset({"SELL"})
NON_CASH_TRADE_TYPES = frozenset({"BONUS", "SPLIT", "DEMERGER"})
MANUAL_TRADE_TYPES = frozenset(
    BUY_LIKE_TRADE_TYPES | SELL_TRADE_TYPES | NON_CASH_TRADE_TYPES
)


def normalize_trade_type(value: str) -> str:
    normalized = " ".join(value.strip().upper().split())
    if normalized == "BUYBACK":
        return "BUY BACK"
    if normalized not in MANUAL_TRADE_TYPES:
        raise ValueError(
            "trade_type must be one of: Buy, Sell, Buy Back, Split, Bonus, Demerger, IPO."
        )
    return normalized
