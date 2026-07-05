from __future__ import annotations

from app.models.nse_eod import NseEod


def eod_symbol_candidates(symbol: str) -> list[str]:
    normalized = symbol.strip().upper()
    candidates = [normalized]

    if "-" in normalized:
        base_symbol = normalized.split("-", 1)[0]
        if base_symbol not in candidates:
            candidates.append(base_symbol)

    return candidates


def resolve_eod_record(
    symbol: str,
    eod_by_symbol: dict[str, NseEod],
) -> NseEod | None:
    for candidate in eod_symbol_candidates(symbol):
        record = eod_by_symbol.get(candidate)
        if record is not None:
            return record
    return None
