import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrialBalanceContent } from "../trial-balance-content";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/common/hooks/use-cookie-storage-state", () => ({
  useCookieStorageState: (_key: string, initial: unknown) => [initial, vi.fn()],
}));

// Heavy ECharts children: this test targets which panel is shown, not the chart.
vi.mock("../../balance-sheet/hierarchy-visualization-card", () => ({
  HierarchyVisualizationCard: ({
    hierarchyTitle,
  }: {
    hierarchyTitle: string;
  }) => <div data-testid="active-chart">{hierarchyTitle}</div>,
}));
vi.mock("../../balance-sheet/hierarchy-list", () => ({
  HierarchyList: () => null,
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

// Stands in for the narrow-viewport view picker so the test can drive the same
// setSelectedTab callback the real Radix select calls.
vi.mock("@/common/components/responsive-tab-trigger-list", () => ({
  ResponsiveTabTriggerList: ({
    setSelectedTab,
    tabOptions,
  }: {
    setSelectedTab: (value: string) => void;
    tabOptions: { label: string; value: string }[];
  }) => (
    <div>
      {tabOptions.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => setSelectedTab(tab.value)}
        >
          {`pick-${tab.value}`}
        </button>
      ))}
    </div>
  ),
}));

function hierarchyNode(account: string) {
  return {
    __typename: "SerializableTreeNode" as const,
    account,
    balance: { USD: "1.00" },
    balanceChildren: { USD: "1.00" },
    children: [],
    hasTxns: true,
    cost: null,
    costChildren: null,
  };
}

const trialBalanceData = {
  assetsHierarchyData: hierarchyNode("Assets"),
  liabilitiesHierarchyData: hierarchyNode("Liabilities"),
  incomeHierarchyData: hierarchyNode("Income"),
  expensesHierarchyData: hierarchyNode("Expenses"),
  equityHierarchyData: hierarchyNode("Equity"),
};

function renderContent() {
  render(
    <TrialBalanceContent
      trialBalanceData={
        trialBalanceData as unknown as React.ComponentProps<
          typeof TrialBalanceContent
        >["trialBalanceData"]
      }
      primaryCurrency="USD"
      ledgerDisplayName="Demo Books"
      ledgerOwner="demo"
      ledgerNameParam="books"
      conversion="at_cost"
      invertIncomeLiabilitiesEquity={false}
      showZeroBalance
      showZeroTransactions
      showClosedAccounts={false}
      closedAccountNames={new Set<string>()}
      collapsePatterns={[]}
    />,
  );
}

describe("TrialBalanceContent", () => {
  it("shows the assets chart by default", () => {
    renderContent();

    expect(screen.getByTestId("active-chart")).toHaveTextContent("Assets");
  });

  it("swaps the displayed chart when the narrow view picker changes", async () => {
    const user = userEvent.setup();
    renderContent();

    await user.click(screen.getByRole("button", { name: "pick-equity" }));

    // Regression: the Tabs root used to be uncontrolled, so the narrow select
    // moved its own state while the assets panel stayed on screen.
    expect(screen.getByTestId("active-chart")).toHaveTextContent("Equity");

    await user.click(screen.getByRole("button", { name: "pick-income" }));

    expect(screen.getByTestId("active-chart")).toHaveTextContent("Income");
  });
});
