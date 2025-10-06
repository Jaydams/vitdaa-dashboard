"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateFilter } from "@/types/dashboard";
import { getDefaultFilter, isValidDateRange } from "@/lib/date-utils";
import { validateFilterParams } from "@/lib/url-validation";

/**
 * Custom hook to manage filter state in URL query parameters
 */
export function useFilterUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<DateFilter>(getDefaultFilter());

  // Parse filter from URL parameters
  const parseFilterFromUrl = useCallback((): DateFilter => {
    // First validate all URL parameters
    const validation = validateFilterParams(searchParams);

    if (!validation.isValid) {
      // Log validation errors for debugging
      console.warn("Invalid filter URL parameters:", validation.errors);
      return getDefaultFilter();
    }

    const type = searchParams.get("period") as DateFilter["type"];
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!type) {
      return getDefaultFilter();
    }

    // Handle custom date range
    if (type === "custom") {
      if (startDateStr && endDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        return {
          type: "custom",
          startDate,
          endDate,
        };
      }
      // If custom type but no dates, return default
      return getDefaultFilter();
    }

    // Return preset filter
    return { type };
  }, [searchParams]);

  // Update URL with filter parameters
  const updateUrlWithFilter = useCallback(
    (newFilter: DateFilter) => {
      const params = new URLSearchParams(searchParams.toString());

      // Set the period type
      params.set("period", newFilter.type);

      // Handle custom date range
      if (
        newFilter.type === "custom" &&
        newFilter.startDate &&
        newFilter.endDate
      ) {
        params.set(
          "startDate",
          newFilter.startDate.toISOString().split("T")[0]
        );
        params.set("endDate", newFilter.endDate.toISOString().split("T")[0]);
      } else {
        // Remove custom date parameters for preset filters
        params.delete("startDate");
        params.delete("endDate");
      }

      // Update URL without causing a page reload
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Initialize filter from URL on mount
  useEffect(() => {
    const urlFilter = parseFilterFromUrl();
    setFilter(urlFilter);
  }, [parseFilterFromUrl]);

  // Update filter and URL
  const updateFilter = useCallback(
    (newFilter: DateFilter) => {
      // Validate custom date range
      if (
        newFilter.type === "custom" &&
        newFilter.startDate &&
        newFilter.endDate &&
        !isValidDateRange(newFilter.startDate, newFilter.endDate)
      ) {
        // Don't update if invalid date range
        return;
      }

      setFilter(newFilter);
      updateUrlWithFilter(newFilter);
    },
    [updateUrlWithFilter]
  );

  // Reset to default filter
  const resetFilter = useCallback(() => {
    const defaultFilter = getDefaultFilter();
    setFilter(defaultFilter);
    updateUrlWithFilter(defaultFilter);
  }, [updateUrlWithFilter]);

  // Get current filter as URL-safe object
  const getFilterParams = useCallback(() => {
    const params: Record<string, string> = {
      period: filter.type,
    };

    if (filter.type === "custom" && filter.startDate && filter.endDate) {
      params.startDate = filter.startDate.toISOString().split("T")[0];
      params.endDate = filter.endDate.toISOString().split("T")[0];
    }

    return params;
  }, [filter]);

  return {
    filter,
    updateFilter,
    resetFilter,
    getFilterParams,
  };
}
