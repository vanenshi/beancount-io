import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerCashFlowDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { cashFlowLoader } from "../loader";

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(
  query: (options: QueryOptions) => Promise<unknown>,
  conversion = "",
) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    deps: { account: "", filter: "", time: "2025", conversion },
    abortController: new AbortController(),
    preload: false,
    cause: "enter" as const,
    location: {} as never,
  };
}

function resolvesLedger(operatingCurrency: string[]) {
  return (options: QueryOptions) =>
    options.query === GetLedgerDocument
      ? Promise.resolve({
          data: { getLedger: { options: { operatingCurrency } } },
        })
      : Promise.resolve({ data: {} });
}

describe("cashFlowLoader", () => {
  it("requests the cash flow query with the destination loader deps", async () => {
    const query = vi.fn(resolvesLedger(["USD"]));

    await cashFlowLoader(loaderInput(query));

    const cashFlowCall = query.mock.calls.find(
      ([options]) => options.query === GetLedgerCashFlowDocument,
    );
    expect(cashFlowCall?.[0]).toEqual({
      query: GetLedgerCashFlowDocument,
      variables: {
        ledgerId: "open_ledger/example",
        account: "",
        filter: "",
        time: "2025",
        interval: "monthly",
        conversion: "at_cost",
      },
    });
  });

  it("resolves the same conversion the page's useQuery call resolves for the same URL", async () => {
    const query = vi.fn(resolvesLedger(["USD", "IRT"]));

    await cashFlowLoader(loaderInput(query, "IRT"));

    const cashFlowCall = query.mock.calls.find(
      ([options]) => options.query === GetLedgerCashFlowDocument,
    );
    expect(cashFlowCall?.[0].variables).toMatchObject({ conversion: "IRT" });
  });

  it("leaves a cash flow query failure to the page's own error state", async () => {
    // A rejection here would reach the route ErrorBoundary, which is keyed by
    // pathname only — it would keep showing the stale error after the user
    // corrects the offending filter search param. The page's useQuery re-reports
    // it instead, and that does recover on a search-param change.
    const query = (options: QueryOptions) =>
      options.query === GetLedgerDocument
        ? Promise.resolve({
            data: { getLedger: { options: { operatingCurrency: ["USD"] } } },
          })
        : Promise.reject(new Error("invalid filter expression"));

    await expect(cashFlowLoader(loaderInput(query))).resolves.toBeUndefined();
  });
});
