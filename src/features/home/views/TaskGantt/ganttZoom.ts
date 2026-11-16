export const ganttZoom = {
  day: { unit: "hour", widths: [40, 50, 60, 70, 80, 90, 100, 110, 120] },
  week: { unit: "day", widths: [32, 42, 52, 62, 72, 82, 92, 102, 112] },
  month: { unit: "week", widths: [80, 110, 140, 170, 200, 230, 260, 290, 320] },
  quarter: {
    unit: "month",
    widths: [64, 96, 128, 160, 192, 224, 256, 288, 320],
  },
  year: {
    unit: "quarter",
    widths: [64, 96, 128, 160, 192, 224, 256, 288, 320],
  },
} as const;
export function zoomLevel(value = 5): number {
  return Math.max(1, Math.min(9, Math.round(value)));
}
