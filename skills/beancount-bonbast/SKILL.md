---
name: beancount-bonbast
description: Fetch Iranian rial (IRR / Toman) free-market exchange rates and gold-coin prices from bonbast.com — live (today's rate) or archive (any past day or date range since about 2014) — and, after confirmation, record them as Beancount price directives. Use for "what's the dollar rate in Iran", "USD to IRR/Toman today", "rial rate on 2024-03-15", "IRR prices for last month", "Emami/Azadi coin price", "add IRR prices to my ledger", "convert my Toman transactions at the historical rate", or Persian asks like قیمت دلار / نرخ ارز / قیمت سکه / دلار آزاد (dollar price, exchange rate, coin price, free-market dollar). Skip official CBI/NIMA/Sana rates (bonbast is the open market), pairs that do not involve the rial, stock or crypto quotes, and managed price includes (`bea price`).
---

# beancount-bonbast

Get rial rates from **bonbast.com**, the de facto reference for Iran's open-market (free-market) rates, through the bundled helper `scripts/bonbast.py` in this skill's directory. The helper is stdlib Python and read-only; it fetches, normalizes, and prints. Ledger writes are a separate, confirm-gated step through `bea`.

## What the source gives you

- **Live**: today's sell and buy for 28 currencies plus five gold coins, with Bonbast's own `as_of` time (Tehran).
- **Archive**: one table per past day, from roughly 2014 through yesterday. Bonbast answers a date it does not have with the latest day's table; the helper detects that and fails with `bonbast has no archive for <date>`, so never retry a refused date and never present a substituted day.
- **Units**: Bonbast quotes in **Toman** (1 Toman = 10 IRR), and JPY and AMD per 10 units, IQD per 100. The helper normalizes every quote to **one unit of the priced commodity in IRR** by default (`--unit TOMAN` keeps the site's Toman figures). Always say which unit and side a figure is in.
- **Commodities**: ISO codes (`USD`, `EUR`, `AED`, `TRY`, …) and coins `COIN-EMAMI`, `COIN-AZADI`, `COIN-AZADI-HALF`, `COIN-AZADI-QUARTER`, `COIN-GERAMI`.
- **Sell vs buy**: `sell` is the rate dealers sell at (what a buyer of dollars pays) and is the headline figure; `buy` is what they pay you. JSON carries both; `--format beancount` prints the `--side` you pick (default `sell`).

## Fetch

Bind `bonbast` to `scripts/bonbast.py` inside this skill's directory, then:

```sh
python3 "$bonbast" live -c USD                      # today's USD, JSON, IRR
python3 "$bonbast" live -c USD -c EUR --unit TOMAN  # in Toman, as the site shows
python3 "$bonbast" archive --date 2024-03-15 -c USD # one past day
python3 "$bonbast" archive --date 2024-03-01 --to 2024-03-31 -c USD --format beancount
```

Omit `-c` for every commodity. JSON shape: `{source, kind, quote_currency, days: [{date, as_of?, quotes: [{commodity, sell, buy}]}]}`; amounts are decimal strings.

An archive range costs one request per day with a 1-second gap (`--delay`), so a year takes about 6 minutes: run long ranges in the background, and for monthly or weekly valuations fetch only the dates needed rather than every day. Requests honor `https_proxy`. Exit code 1 with a `bonbast:` line on stderr means the fetch or the page format failed; report that line rather than guessing a rate.

## Answer a rate question

Lead with the figure, its date (and `as_of` for live), side, and unit, e.g. "USD sells at 2,729,500 IRR (272,950 Toman) on bonbast.com, as of 2026-10-22 14:10 Tehran time; buy 2,727,500 IRR." Every figure comes from a helper run in this conversation; never quote a rate from memory, and never convert with model arithmetic beyond the stated Toman/IRR factor of 10.

## Record prices in a ledger

Prefer `bea` for the write. Read beancount-init's `references/bea-cli.md` (from this skill's folder, `../beancount-init/references/bea-cli.md`; a copy at `references/bea-cli.md` when this skill was installed alone) first: it defines `--file`, `--into`, and checks. Without `bea`, use beancount-init's `references/compatibility.md`.

1. **Discover** the main ledger (`fd -e beancount -e bean .`; the root has `option`/`include` directives) and bind it as `ledger`. Read the rial commodity the ledger already uses (`IRR`, `IRT`, `TOMAN`, …) and its coin commodity names from `commodity`/`open` directives and existing `price` entries. Use the ledger's names: an IRR ledger takes the default output; a Toman ledger takes `--unit TOMAN` with the ledger's own Toman symbol in each amount. Never invent a commodity; if the ledger has none for the rial, ask.
2. **Pick the destination**: an existing included prices file if there is one, otherwise ask before creating one (and the `include` it needs).
3. **Fetch and propose**: run the helper with `--format beancount` for the agreed dates, commodities and side, and show the directives with source, side, and unit. Wait for confirmation.
4. **Write** each confirmed directive:

   ```sh
   bea --file "$ledger" --json --no-input add price --date "$date" --commodity USD --amount "$amount IRR" --into "$target"
   ```

   An exact existing date/commodity/amount match returns `"duplicate": true` and writes nothing, so re-running a batch is safe. A different amount already on that date exits 2 (`refusing …`); show the user both figures and do not pass `--force` unless they ask for a second quote.
5. **Check**: `bea --file "$ledger" --json --no-input check`. Report the directives written and the check result.

## Compatibility fallback

Without `bea`, append the confirmed `--format beancount` lines (without the leading `;` comment, or keep it as provenance) to the agreed prices file, then run the developer `bean-check` on the root ledger. Do not install a second Beancount for this.
