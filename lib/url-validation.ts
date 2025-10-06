import { DateFilter } from "@/types/dashboard";

/**
 * Validate URL query parameters for date filters
 */
export function validateFilterParams(params: URLSearchParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const period = params.get("period");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  // Validate period type
  const validPeriods: DateFilter["type"][] = [
    "today",
    "yesterday",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
    "custom",
  ];

  if (period && !validPeriods.includes(period as DateFilter["type"])) {
    errors.push(`Invalid period type: ${period}`);
  }

  // Validate custom date range
  if (period === "custom") {
    if (!startDate || !endDate) {
      errors.push(
        "Custom period requires both startDate and endDate parameters"
      );
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push(`Invalid startDate format: ${startDate}`);
      }

      if (isNaN(end.getTime())) {
        errors.push(`Invalid endDate format: ${endDate}`);
      }

      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
        errors.push("startDate must be before or equal to endDate");
      }

      // Check for reasonable date range (not more than 2 years)
      const maxRangeDays = 730; // 2 years
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > maxRangeDays) {
        errors.push(
          `Date range too large: maximum ${maxRangeDays} days allowed`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize URL parameters by removing invalid ones
 */
export function sanitizeFilterParams(params: URLSearchParams): URLSearchParams {
  const sanitized = new URLSearchParams();

  const validation = validateFilterParams(params);

  if (validation.isValid) {
    // If all params are valid, return as-is
    return params;
  }

  // If invalid, return empty params (will default to "today")
  return sanitized;
}

/**
 * Get safe filter parameters with fallback to default
 */
export function getSafeFilterParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const validation = validateFilterParams(searchParams);

  if (validation.isValid) {
    return searchParams;
  }

  // Return default params
  const defaultParams = new URLSearchParams();
  defaultParams.set("period", "today");
  return defaultParams;
}

/**
 * Parse DateFilter from URL search parameters
 */
export function parseFilterFromUrl(searchParams: URLSearchParams): DateFilter {
  const safeParams = getSafeFilterParams(searchParams);

  const period = (safeParams.get("period") as DateFilter["type"]) || "today";
  const startDateStr = safeParams.get("startDate");
  const endDateStr = safeParams.get("endDate");

  if (period === "custom" && startDateStr && endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate dates
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      return {
        type: "custom",
        startDate,
        endDate,
      };
    }
  }

  return {
    type: period,
    startDate: undefined,
    endDate: undefined,
  };
}
