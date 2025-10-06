import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
} from "date-fns";
import { DateFilter } from "@/types/dashboard";

/**
 * Convert a DateFilter to actual start and end dates
 */
export function getDateRangeFromFilter(filter: DateFilter): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();

  switch (filter.type) {
    case "today":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };

    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };

    case "this_week":
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        endDate: endOfWeek(now, { weekStartsOn: 1 }), // Sunday
      };

    case "last_week":
      const lastWeek = subWeeks(now, 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };

    case "this_month":
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };

    case "last_month":
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };

    case "custom":
      if (!filter.startDate || !filter.endDate) {
        // Fallback to today if custom dates are not provided
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(now),
        };
      }
      return {
        startDate: startOfDay(filter.startDate),
        endDate: endOfDay(filter.endDate),
      };

    default:
      // Fallback to today
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
  }
}

/**
 * Validate if a custom date range is valid
 */
export function isValidDateRange(startDate?: Date, endDate?: Date): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  return startDate <= endDate;
}

/**
 * Get a human-readable description of the date filter
 */
export function getFilterDescription(filter: DateFilter): string {
  switch (filter.type) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "this_week":
      return "This Week";
    case "last_week":
      return "Last Week";
    case "this_month":
      return "This Month";
    case "last_month":
      return "Last Month";
    case "custom":
      if (filter.startDate && filter.endDate) {
        const { startDate, endDate } = getDateRangeFromFilter(filter);
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      }
      return "Custom Range";
    default:
      return "Unknown Period";
  }
}

/**
 * Create a default filter (today)
 */
export function getDefaultFilter(): DateFilter {
  return {
    type: "today",
  };
}
