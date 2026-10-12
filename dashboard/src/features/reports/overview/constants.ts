import type { ChartInterval } from "@/common/types/chart";

/**
 * The flow modules (Money movement, Income vs Expenses) take their
 * `conversion` from the ledger's report conversion (`useReportConversion`),
 * the same choice the Income Statement opens with. The balance modules read
 * `GetLedgerOverviewValuation` instead, which values holdings at market.
 */
export const overviewQueryDefaults: { interval: ChartInterval } = {
  interval: "monthly",
};
