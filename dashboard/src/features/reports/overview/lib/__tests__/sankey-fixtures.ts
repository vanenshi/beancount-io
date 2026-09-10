import {
  buildCashFlowStatement,
  type AccountMetaMap,
  type IntervalAccountChanges,
} from "@/features/reports/cash-flow/lib/model";
import { sumBalanceRecords } from "@/features/reports/export/model";

/** The cash account each fixture interval settles through. */
const FIXTURE_CASH_ACCOUNT = "Assets:Bank:Checking";

/**
 * Build a real statement from fixtures that list only the non-cash side.
 * Like a real ledger, each interval's changes must sum to zero, so the cash
 * leg that settles the listed movements is added to every interval that does
 * not already balance.
 */
export function statementFrom(
  intervals: IntervalAccountChanges[],
  primaryCurrency: string,
  accountMeta?: AccountMetaMap,
) {
  return buildCashFlowStatement({
    intervals: intervals.map((interval) => {
      const settlement = Object.fromEntries(
        Object.entries(
          sumBalanceRecords(Object.values(interval.accountChanges)),
        )
          .filter(([, residual]) => Number(residual) !== 0)
          .map(([unit, residual]) => [
            unit,
            residual.startsWith("-") ? residual.slice(1) : `-${residual}`,
          ]),
      );
      return Object.keys(settlement).length === 0
        ? interval
        : {
            ...interval,
            accountChanges: {
              ...interval.accountChanges,
              [FIXTURE_CASH_ACCOUNT]: settlement,
            },
          };
    }),
    closingCashAccounts: [],
    primaryCurrency,
    accountMeta,
  });
}
