export interface DateRange {
  gte: string;
  lt?: string;
}

/**
 * Get date range for filtering by "thisMonth", "previousMonth", "thisYear", or "lastYear"
 * @param period - "thisMonth", "previousMonth", "thisYear", or "lastYear"
 * @returns Object with gte and optional lt ISO date strings, or null if period is invalid
 */
export function getDateRange(period: string | undefined): DateRange | null {
  if (
    !period ||
    !["thisMonth", "previousMonth", "thisYear", "lastYear"].includes(period)
  ) {
    return null;
  }

  if (period === "thisMonth") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return {
      gte: startOfMonth.toISOString(),
    };
  }

  if (period === "previousMonth") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setMonth(startOfMonth.getMonth() - 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setDate(1);
    endOfMonth.setHours(0, 0, 0, 0);

    return {
      gte: startOfMonth.toISOString(),
      lt: endOfMonth.toISOString(),
    };
  }

  if (period === "thisYear") {
    const startOfYear = new Date();
    startOfYear.setMonth(0);
    startOfYear.setDate(1);
    startOfYear.setHours(0, 0, 0, 0);
    return {
      gte: startOfYear.toISOString(),
    };
  }

  // lastYear
  const startOfYear = new Date();
  startOfYear.setFullYear(startOfYear.getFullYear() - 1);
  startOfYear.setMonth(0);
  startOfYear.setDate(1);
  startOfYear.setHours(0, 0, 0, 0);

  const endOfYear = new Date();
  endOfYear.setMonth(0);
  endOfYear.setDate(1);
  endOfYear.setHours(0, 0, 0, 0);

  return {
    gte: startOfYear.toISOString(),
    lt: endOfYear.toISOString(),
  };
}
