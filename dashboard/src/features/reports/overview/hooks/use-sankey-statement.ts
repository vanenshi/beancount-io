import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerCashFlowSankeyDocument } from "@/graphql/definitions";
import { mergeIntervalAccountChanges } from "@/features/reports/cash-flow/lib/merge-intervals";
import {
  buildCashFlowStatement,
  CashFlowReconciliationError,
  type AccountMetaMap,
  type CashFlowStatement,
} from "@/features/reports/cash-flow/lib/model";

export interface SankeyStatementState {
  /**
   * The period's cash-flow statement in the presentation currency, once the
   * interval totals have loaded. Undefined while pending and when the query
   * failed — the Sankey card then shows its empty state instead of failing
   * the whole overview page.
   */
  statement: CashFlowStatement | undefined;
  /**
   * The converted movements did not sum to zero, so no statement can be drawn
   * in the presentation currency (e.g. prices moved within an interval). The
   * card says so rather than claiming there were no flows.
   */
  unreconciled: boolean;
  /** True while the flows are still loading with nothing cached. */
  pending: boolean;
}

interface LedgerFilterVariables {
  account?: string | null;
  filter?: string | null;
  time?: string | null;
}

/**
 * Period flows for the overview Sankey, as a cash-flow statement.
 *
 * Fetched apart from GetLedgerOverview on purpose: the overview route loader
 * has no `primaryCurrency` to pass as the conversion target, and keeping this
 * a client-side hook leaves the loader's SSR path untouched while letting a
 * failure degrade the Sankey card alone (same shape as `useAccountMeta`).
 *
 * The statement is built with `closingCashAccounts: []` — the Sankey reads
 * only `rows` and `netChange`, so `opening`/`closing` are meaningless here and
 * `hasHeuristicCashAccounts` is always false. Nothing downstream reads them.
 */
export function useSankeyStatement(
  ledgerId: string,
  primaryCurrency: string,
  filters: LedgerFilterVariables,
  accountMeta?: AccountMetaMap,
): SankeyStatementState {
  const { data, loading } = useQuery(GetLedgerCashFlowSankeyDocument, {
    variables: {
      ledgerId,
      conversion: primaryCurrency,
      account: filters.account,
      filter: filters.filter,
      time: filters.time,
    },
    fetchPolicy: "cache-first",
  });

  const { statement, unreconciled } = useMemo(() => {
    if (!data) return { statement: undefined, unreconciled: false };
    // A partial response (one root errored, an older backend) must degrade
    // this card, not throw through the overview page that renders it.
    const intervals = mergeIntervalAccountChanges(
      data.incomeIntervals ?? [],
      data.expenseIntervals ?? [],
      data.assetIntervals ?? [],
      data.liabilityIntervals ?? [],
      data.equityIntervals ?? [],
    );
    try {
      return {
        statement: buildCashFlowStatement({
          intervals,
          closingCashAccounts: [],
          primaryCurrency,
          accountMeta,
        }),
        unreconciled: false,
      };
    } catch (error) {
      // Same degradation as the cash-flow page; anything else is a real bug.
      if (!(error instanceof CashFlowReconciliationError)) throw error;
      return { statement: undefined, unreconciled: true };
    }
  }, [data, primaryCurrency, accountMeta]);

  return { statement, unreconciled, pending: loading && !data };
}
