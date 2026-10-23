import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ruOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Распределение",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Потоки",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Доля от общей суммы",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Доля от суммы абсолютных значений",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
  },
  "page.overview.netWorthByMonth": {
    message: "Чистые активы по месяцам",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Месяц",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.ru,
  ...emptyLedgerOverviewTranslations.ru,
  "page.overview.assetsDistribution": {
    message: "Распределение активов",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Визуальное представление состава {ledgerName} активов",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Денежный поток",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Поток денег от источников дохода к расходам и инвестициям",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Не удалось загрузить обзорную информацию главной книги. Пожалуйста, попробуйте позже.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Распределение обязательств",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Визуальное представление состава {ledgerName} обязательств",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Загрузка обзорных данных…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Загрузка ролей счетов…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.chartUnitScope": {
    message: "Суммы показаны в {unit}. Остатки в {others} не включены.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.cashFlowToCash": {
    message: "В денежные средства",
    description:
      "Sankey node label for the period's net increase in cash and cash equivalents",
  },
  "page.overview.cashFlowFromCash": {
    message: "Из денежных средств",
    description:
      "Sankey node label for the period's net decrease in cash and cash equivalents",
  },
  "page.overview.cashFlowUnshownUnits": {
    message:
      "Показано в {currency}. Для {units} нет цены в {currency}, поэтому они не вошли в диаграмму.",
    description:
      "Caption under the cash flow chart listing units that could not be converted to the presentation currency",
  },
  "page.overview.cashFlowUnreconciled": {
    message:
      "Потоки за этот период не сходятся в {currency}, поэтому диаграмма скрыта.",
    description:
      "Shown instead of the cash flow chart when the period's converted movements do not sum to zero in the presentation currency",
  },
  "page.overview.cashFlowNoFlows": {
    message: "В этом периоде нет потоков в {currency}.",
    description:
      "Empty state shown when the cash flow chart has no movement in the presentation currency",
  },
  "page.overview.starButton.star": {
    message: "Звезда",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Со звездой",
    description: "Button label indicating the ledger is starred",
  },
};

export default ruOverview;
