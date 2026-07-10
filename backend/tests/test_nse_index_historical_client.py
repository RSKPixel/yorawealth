from __future__ import annotations

import unittest

from app.services.nse_index_historical_client import parse_index_historical_payload


class NseIndexHistoricalClientTests(unittest.TestCase):
    def test_parse_json_payload(self) -> None:
        payload = """
        {
          "data": [
            {
              "EOD_TIMESTAMP": "31-JAN-2025",
              "EOD_CLOSE_INDEX_VAL": 23508.4
            },
            {
              "EOD_TIMESTAMP": "30-JAN-2025",
              "EOD_CLOSE_INDEX_VAL": 23277.4
            }
          ]
        }
        """

        rows = parse_index_historical_payload(payload)

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["symbol"], "NIFTY 50")
        self.assertEqual(str(rows[0]["trade_date"]), "2025-01-31")
        self.assertEqual(rows[0]["close"], 23508.4)

    def test_parse_csv_payload(self) -> None:
        payload = (
            "Index Date,Open Index Value,High Index Value,Low Index Value,"
            "Closing Index Value\n"
            "31-Jan-2024,21600.10,21750.25,21580.00,21725.70\n"
        )

        rows = parse_index_historical_payload(payload)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["close"], 21725.7)


if __name__ == "__main__":
    unittest.main()
