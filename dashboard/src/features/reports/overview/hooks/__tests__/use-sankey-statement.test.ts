import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseQuery = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { useSankeyStatement } from "../use-sankey-statement";

/** One interval per root, in the shape GetLedgerCashFlowSankey returns. */
function intervals(checking: string) {
  const at = (accountBalances: Record<string, unknown>) => [
    { date: "2026-12-31", accountBalances },
  ];
  return {
    incomeIntervals: at({ "Income:Salary": { USD: "-5000.00" } }),
    expenseIntervals: at({ "Expenses:Food": { USD: "800.00" } }),
    assetIntervals: at({ "Assets:Bank:Checking": { USD: checking } }),
    liabilityIntervals: [],
    equityIntervals: [],
  };
}

describe("useSankeyStatement", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("builds the statement when the movements reconcile", () => {
    mockUseQuery.mockReturnValue({
      data: intervals("4200.00"),
      loading: false,
    });

    const { result } = renderHook(() =>
      useSankeyStatement("owner/ledger", "USD", {}),
    );

    expect(result.current.unreconciled).toBe(false);
    expect(result.current.statement).toBeDefined();
  });

  it("degrades the card instead of throwing when the movements do not reconcile", () => {
    // 200 USD unaccounted for in 2026-12-31: the overview page once crashed
    // with CashFlowReconciliationError here.
    mockUseQuery.mockReturnValue({
      data: intervals("4000.00"),
      loading: false,
    });

    const { result } = renderHook(() =>
      useSankeyStatement("owner/ledger", "USD", {}),
    );

    expect(result.current).toEqual({
      statement: undefined,
      unreconciled: true,
      pending: false,
    });
  });
});
