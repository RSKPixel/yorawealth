ZERODHA_BROKER = "Zerodha"

SUPPORTED_STOCK_BROKERS = frozenset({ZERODHA_BROKER})


def is_supported_broker(value: str) -> bool:
    return value in SUPPORTED_STOCK_BROKERS


def resolve_tradebook_template(broker: str) -> str:
    from app.services.tradebook_templates import ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID

    if broker == ZERODHA_BROKER:
        return ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID

    raise ValueError("Unsupported broker.")
