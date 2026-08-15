export type ReportType = "store" | "barber";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  store: "Store",
  barber: "Barber",
};

export function getReportTypeMeta(type: ReportType) {
  return {
    value: type,
    label: REPORT_TYPE_LABELS[type],
  };
}
