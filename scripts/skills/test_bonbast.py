#!/usr/bin/env python3
"""Offline tests for beancount-bonbast's scripts/bonbast.py parsers.

Fixtures are real captures of bonbast.com's live JSON and archive page, so
these tests pin the page formats the helper depends on without network.
"""

from __future__ import annotations

import importlib.util
import json
import re
import unittest
from datetime import date
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2] / "skills" / "beancount-bonbast"
FILES = SKILL / "evals" / "files"

spec = importlib.util.spec_from_file_location("bonbast", SKILL / "scripts" / "bonbast.py")
bonbast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bonbast)

LIVE = json.loads((FILES / "live-2026-10-22.json").read_text(encoding="utf-8"))
ARCHIVE = (FILES / "archive-2024-03-15.html").read_text(encoding="utf-8")


def by_commodity(day: dict) -> dict[str, dict]:
    return {q["commodity"]: q for q in day["quotes"]}


class TestLive(unittest.TestCase):
    def test_normalizes_toman_and_per_unit_quotes_to_irr(self):
        day = bonbast.parse_live(LIVE, "IRR")
        quotes = by_commodity(day)
        self.assertEqual(day["date"], "2026-10-22")
        self.assertEqual(day["as_of"], "2026-10-22T14:10")
        self.assertEqual(quotes["USD"], {"commodity": "USD", "sell": "2729500", "buy": "2727500"})
        self.assertEqual(quotes["JPY"]["sell"], "17350")  # 17350 Toman per 10 JPY
        self.assertEqual(quotes["IQD"]["sell"], "1800")  # 18000 Toman per 100 IQD
        self.assertEqual(quotes["COIN-EMAMI"]["sell"], "2740000000")

    def test_toman_unit_keeps_site_figures(self):
        self.assertEqual(by_commodity(bonbast.parse_live(LIVE, "TOMAN"))["USD"]["sell"], "272950")


class TestArchive(unittest.TestCase):
    def test_parses_currency_and_coin_tables(self):
        quotes = by_commodity(bonbast.parse_archive(ARCHIVE, date(2024, 3, 15), "IRR"))
        self.assertEqual(quotes["USD"], {"commodity": "USD", "sell": "594500", "buy": "593500"})
        self.assertEqual(quotes["AMD"]["sell"], "1475")  # 1475 Toman per 10 AMD
        self.assertEqual(quotes["COIN-AZADI-QUARTER"]["buy"], "133500000")
        self.assertEqual(len([c for c in quotes if c.startswith("COIN-")]), len(bonbast.COINS))

    def test_refuses_a_page_for_another_day(self):
        # Bonbast answers unknown dates with the latest day's table.
        with self.assertRaisesRegex(bonbast.BonbastError, "no archive for 2024-03-16"):
            bonbast.parse_archive(ARCHIVE, date(2024, 3, 16), "IRR")


class TestLiveArchiveParity(unittest.TestCase):
    def test_per_unit_map_matches_archive_superscripts(self):
        marked = {code: int(per) for code, per in re.findall(r"([A-Z]{3})</td><td><sup[^>]*>(\d+)</sup>", ARCHIVE)}
        self.assertEqual(marked, bonbast.PER_UNITS)

    def test_live_and_archive_price_the_same_commodities(self):
        live = set(by_commodity(bonbast.parse_live(LIVE, "IRR")))
        archive = set(by_commodity(bonbast.parse_archive(ARCHIVE, date(2024, 3, 15), "IRR")))
        self.assertEqual(live, archive)


class TestRender(unittest.TestCase):
    def test_beancount_output_is_price_directives(self):
        day = bonbast.parse_archive(ARCHIVE, date(2024, 3, 15), "IRR")
        result = {"kind": "archive", "quote_currency": "IRR", "days": bonbast.select([day], ["usd"])}
        self.assertEqual(
            bonbast.render(result, "sell", "beancount").splitlines(),
            ["; bonbast.com archive sell rates, quoted in IRR", "2024-03-15 price USD 594500 IRR"],
        )


if __name__ == "__main__":
    unittest.main()
