import { DateFilter } from "@/types/dashboard";

/**
 * Helper function to format currency amounts from kobo/cents to naira
 */
export function formatCurrency(amount: number): string {
  // Convert from kobo to naira (divide by 100)
  const nairaAmount = amount / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(nairaAmount);
}

/**
 * Helper function to validate date ranges
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  if (startDate > endDate) {
    return false;
  }

  // Check if date range is not too large (e.g., max 1 year)
  const maxDays = 365;
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysDiff <= maxDays;
}

/**
 * Helper function to get default date filter (today)
 */
export function getDefaultDateFilter(): DateFilter {
  return {
    type: "today",
  };
}
