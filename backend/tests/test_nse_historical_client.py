import unittest

from app.services.nse_historical_client import normalize_historical_symbol


class NseHistoricalClientTests(unittest.TestCase):
    def test_normalize_strips_zerodha_suffix(self) -> None:
        self.assertEqual(
            normalize_historical_symbol("SGBFEB32IV-GB"),
            "SGBFEB32IV",
        )

    def test_normalize_keeps_plain_symbol(self) -> None:
        self.assertEqual(normalize_historical_symbol("RELIANCE"), "RELIANCE")


if __name__ == "__main__":
    unittest.main()
