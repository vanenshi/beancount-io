/**
 * The distribution charts' unit contract, against realistic account trees.
 *
 * The Sankey's one-unit rule is covered by sankey-data-transformer.test.ts,
 * since it projects the cash-flow statement rather than these trees.
 */
import { describe, expect, it } from "vitest";
import { buildDistributionData } from "../overview-utils";

type Node = {
  account: string;
  balance?: Record<string, unknown> | null;
  children?: Node[];
};

const node = (
  account: string,
  balance: Record<string, unknown> | null,
  children: Node[] = [],
): Node => ({ account, balance, children });

/** Assets:US with cash two levels down, plus a mixed-unit leaf. */
const assets = node("Assets:US", null, [
  node("Assets:US:BofA", null, [
    node("Assets:US:BofA:Checking", { USD: 6377.23 }),
  ]),
  node("Assets:US:ETrade", null, [
    node("Assets:US:ETrade:Cash", { USD: 386.22 }),
    node("Assets:US:ETrade:ITOT", { USD: 6154.51 }),
  ]),
  node("Assets:US:Hoogle", null, [
    node("Assets:US:Hoogle:Vacation", { VACHR: 25 }),
  ]),
]);

describe("distribution slices stay in one unit", () => {
  it("keeps vacation hours out of the dollar slices and the denominator", () => {
    const { items, unit, units } = buildDistributionData(assets);
    expect(unit).toBe("USD");
    expect(units).toEqual(["USD", "VACHR"]);
    // Every leaf, including the cash ones: distribution is composition, not
    // cash-flow activity, so it does not apply role exclusions.
    const total = items.reduce((sum, item) => sum + item.value, 0);
    expect(total).toBeCloseTo(6377.23 + 386.22 + 6154.51, 2);
    expect(items.some((item) => item.value === 25)).toBe(false);
  });

  it("keeps a single leaf's other units out of its own slice", () => {
    const mixed = node("Assets:Mixed", null, [
      node("Assets:Mixed:Both", { USD: 386.22, VACHR: 25 }),
    ]);
    const { items } = buildDistributionData(mixed);
    expect(items).toHaveLength(1);
    expect(items[0].value).toBe(386.22);
  });

  it("says nothing to disclose for a single-unit ledger", () => {
    const { unit, units } = buildDistributionData(
      node("Liabilities:Slate", { USD: 1768.88 }),
    );
    expect(unit).toBe("USD");
    expect(units).toEqual(["USD"]);
  });
});
