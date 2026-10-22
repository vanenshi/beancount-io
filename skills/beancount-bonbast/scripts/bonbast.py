#!/usr/bin/env python3
"""Fetch Iranian free-market rial rates from bonbast.com (live or archive).

Bonbast publishes Tehran free-market sell/buy rates in Toman (1 Toman = 10
IRR), quoted per 1 unit except a few currencies quoted per 10 or 100 units.
This helper normalizes every quote to one unit of the priced commodity in IRR
(or Toman with --unit TOMAN) and prints JSON or Beancount `price` directives.
It only reads from bonbast.com; it never writes a ledger.

    bonbast.py live [-c USD] [--side sell|buy] [--unit IRR|TOMAN] [--format json|beancount]
    bonbast.py archive --date YYYY-MM-DD [--to YYYY-MM-DD] [-c USD] [...]

Bonbast has no public free API: live rates come from the token-gated JSON
call its home page makes, archive rates from its /archive form. Either can
change without notice; failures exit non-zero with the reason on stderr.
Stdlib only, so it runs with any python3 (no extra installs).
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from decimal import Decimal

BASE = "https://www.bonbast.com"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/127.0 Safari/537.36"
)
TOMAN_IN_IRR = Decimal(10)

# Currencies Bonbast quotes per N units (the archive table marks them with a
# superscript; the live JSON does not, so live parsing relies on this map).
# test_bonbast.py checks it against the archive fixture's superscripts.
PER_UNITS = {"AMD": 10, "IQD": 100, "JPY": 10}

# Gold coins: live JSON key -> (commodity, archive row label).
COINS = {
    "azadi1": ("COIN-AZADI", "Azadi"),
    "emami1": ("COIN-EMAMI", "Emami"),
    "azadi1_2": ("COIN-AZADI-HALF", "One half Azadi"),
    "azadi1_4": ("COIN-AZADI-QUARTER", "One quarter Azadi"),
    "azadi1g": ("COIN-GERAMI", "Gerami"),
}

TOKEN = re.compile(r"""param\s*:\s*["']([^"']+)["']""")
ARCHIVE_DATE = re.compile(r'name=\s*"date"\s+value=\s*"(\d{4}-\d{2}-\d{2})"')
CURRENCY_ROW = re.compile(
    r"<td>(?:<img[^>]*>)?([A-Z]{3})</td>"
    r"<td>(?:<sup[^>]*>(\d+)</sup>)?[^<]*</td>"
    r"<td>(\d+)</td><td>(\d+)</td>"
)
COIN_ROW = re.compile(r'<img class="gold-logo"[^>]*alt="([^"]+)"[^>]*>.*?</td><td>(\d+)</td><td>(\d+)</td>')


class BonbastError(RuntimeError):
    pass


def quote(commodity: str, sell: str, buy: str, per: int, unit: str) -> dict:
    scale = TOMAN_IN_IRR if unit == "IRR" else Decimal(1)
    return {
        "commodity": commodity,
        "sell": str(Decimal(sell) * scale / per),
        "buy": str(Decimal(buy) * scale / per),
    }


def parse_live(payload: dict, unit: str) -> dict:
    """Live JSON: `<code>1` is sell, `<code>2` is buy; coins add a trailing 2."""
    quotes = []
    for key, sell in sorted(payload.items()):
        code = key[:-1]
        if re.fullmatch(r"[a-z]{3}1", key) and f"{code}2" in payload:
            upper = code.upper()
            quotes.append(quote(upper, sell, payload[f"{code}2"], PER_UNITS.get(upper, 1), unit))
    for key, (commodity, _label) in COINS.items():
        if key in payload and f"{key}2" in payload:
            quotes.append(quote(commodity, payload[key], payload[f"{key}2"], 1, unit))
    try:
        as_of = datetime.strptime(payload["last_modified"], "%B %d, %Y %H:%M")
    except (KeyError, ValueError) as exc:
        raise BonbastError(f"live payload has no usable last_modified: {exc}") from exc
    if not quotes:
        raise BonbastError("live payload contained no rates; the format may have changed")
    return {"date": as_of.date().isoformat(), "as_of": as_of.isoformat(timespec="minutes"), "quotes": quotes}


def parse_archive(html: str, requested: date, unit: str) -> dict:
    # Out-of-range dates silently get the latest day instead; refuse them.
    echoed = ARCHIVE_DATE.search(html)
    if not echoed:
        raise BonbastError("archive page has no date field; the format may have changed")
    if echoed.group(1) != requested.isoformat():
        raise BonbastError(
            f"bonbast has no archive for {requested} (it served {echoed.group(1)} instead)"
        )
    quotes = [
        quote(code, sell, buy, int(per or 1), unit)
        for code, per, sell, buy in CURRENCY_ROW.findall(html)
    ]
    by_label = {label: commodity for commodity, label in COINS.values()}
    quotes += [
        quote(by_label[label], sell, buy, 1, unit)
        for label, sell, buy in COIN_ROW.findall(html)
        if label in by_label
    ]
    if not quotes:
        raise BonbastError(f"archive page for {requested} contained no rates")
    return {"date": requested.isoformat(), "quotes": quotes}


def opener() -> urllib.request.OpenerDirector:
    # Honors https_proxy/HTTPS_PROXY through the default ProxyHandler.
    built = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    built.addheaders = [("User-Agent", USER_AGENT), ("Referer", f"{BASE}/")]
    return built


def request(client: urllib.request.OpenerDirector, path: str, form: dict | None = None) -> str:
    data = urllib.parse.urlencode(form).encode() if form is not None else None
    try:
        with client.open(f"{BASE}{path}", data=data, timeout=30) as response:
            return response.read().decode("utf-8", "replace")
    except OSError as exc:
        raise BonbastError(f"{'POST' if data else 'GET'} {BASE}{path} failed: {exc}") from exc


def fetch_live(unit: str) -> dict:
    client = opener()
    token = TOKEN.search(request(client, "/"))
    if not token:
        raise BonbastError("home page has no rates token; the format may have changed")
    client.addheaders.append(("X-Requested-With", "XMLHttpRequest"))
    body = request(client, "/json", {"param": token.group(1)})
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise BonbastError(f"live endpoint did not return JSON: {body[:120]!r}") from exc
    return parse_live(payload, unit)


def fetch_archive(start: date, end: date, unit: str, delay: float) -> list[dict]:
    if end < start:
        raise BonbastError("--to is before --date")
    client = opener()
    days, day = [], start
    while day <= end:
        days.append(parse_archive(request(client, "/archive", {"date": day.isoformat()}), day, unit))
        day += timedelta(days=1)
        if day <= end:
            time.sleep(delay)  # One request per day of range; stay polite.
    return days


def select(days: list[dict], commodities: list[str]) -> list[dict]:
    if not commodities:
        return days
    wanted = {c.upper() for c in commodities}
    for day in days:
        day["quotes"] = [q for q in day["quotes"] if q["commodity"] in wanted]
        missing = wanted - {q["commodity"] for q in day["quotes"]}
        if missing:
            raise BonbastError(f"{day['date']}: bonbast has no quote for {', '.join(sorted(missing))}")
    return days


def render(result: dict, side: str, fmt: str) -> str:
    if fmt == "json":
        return json.dumps(result, indent=2, ensure_ascii=False)
    lines = [f"; bonbast.com {result['kind']} {side} rates, quoted in {result['quote_currency']}"]
    for day in result["days"]:
        lines += [f"{day['date']} price {q['commodity']} {q[side]} {result['quote_currency']}" for q in day["quotes"]]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="kind", required=True)
    live = sub.add_parser("live", help="current rates")
    archive = sub.add_parser("archive", help="historical daily rates")
    archive.add_argument("--date", required=True, type=date.fromisoformat, help="first day, YYYY-MM-DD")
    archive.add_argument("--to", type=date.fromisoformat, help="last day (inclusive); default --date")
    archive.add_argument("--delay", type=float, default=1.0, help="seconds between days (default 1)")
    for command in (live, archive):
        command.add_argument("-c", "--commodity", action="append", default=[],
                             help="USD, EUR, COIN-EMAMI, ...; repeat for several (default: all)")
        command.add_argument("--side", choices=("sell", "buy"), default="sell",
                             help="which quote --format beancount prints (default sell)")
        command.add_argument("--unit", choices=("IRR", "TOMAN"), default="IRR",
                             help="quote currency (default IRR; 1 Toman = 10 IRR)")
        command.add_argument("--format", choices=("json", "beancount"), default="json")
    args = parser.parse_args(argv)
    try:
        if args.kind == "live":
            day = fetch_live(args.unit)
            days = [day]
        else:
            days = fetch_archive(args.date, args.to or args.date, args.unit, args.delay)
        result = {
            "source": BASE,
            "kind": args.kind,
            "quote_currency": args.unit,
            "days": select(days, args.commodity),
        }
    except BonbastError as exc:
        print(f"bonbast: {exc}", file=sys.stderr)
        return 1
    print(render(result, args.side, args.format))
    return 0


if __name__ == "__main__":
    sys.exit(main())
