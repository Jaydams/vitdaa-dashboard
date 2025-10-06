"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateFilter, DateRangeFilterProps } from "@/types/dashboard";
import { AdvancedDatePicker } from "@/components/ui/advanced-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFilterUrlState } from "@/hooks/use-filter-url-state";

// Preset filter options
const PRESET_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
] as const;

// Updated component props to make URL state management optional
interface DateRangeFilterPropsWithUrl
  extends Omit<DateRangeFilterProps, "currentFilter" | "onFilterChange"> {
  onFilterChange?: (filter: DateFilter) => void;
  currentFilter?: DateFilter;
  useUrlState?: boolean;
}

export function DateRangeFilter({
  onFilterChange,
  currentFilter,
  isLoading = false,
  useUrlState = true,
}: DateRangeFilterPropsWithUrl) {
  // Use URL state management if enabled, otherwise use props
  const urlState = useFilterUrlState();

  const activeFilter = useUrlState
    ? urlState.filter
    : currentFilter || { type: "today" };
  const handleFilterChange = useUrlState
    ? urlState.updateFilter
    : onFilterChange || (() => {});

  const [showCustomRange, setShowCustomRange] = React.useState(
    activeFilter.type === "custom"
  );

  // Update showCustomRange when filter changes
  React.useEffect(() => {
    setShowCustomRange(activeFilter.type === "custom");
  }, [activeFilter.type]);

  // Handle preset filter selection
  const handlePresetChange = (value: string) => {
    const filterType = value as DateFilter["type"];

    if (filterType === "custom") {
      setShowCustomRange(true);
      // For custom, create a filter with current date as default
      const today = new Date();
      const newFilter = {
        type: "custom" as const,
        startDate: today,
        endDate: today,
      };
      handleFilterChange(newFilter);
      // Also notify parent if not using URL state
      if (!useUrlState && onFilterChange) {
        onFilterChange(newFilter);
      }
      return;
    }

    setShowCustomRange(false);
    const newFilter = {
      type: filterType,
      startDate: undefined,
      endDate: undefined,
    };
    handleFilterChange(newFilter);
    // Also notify parent if not using URL state
    if (!useUrlState && onFilterChange) {
      onFilterChange(newFilter);
    }
  };

  // Handle custom date range changes
  const handleStartDateChange = (date: Date | undefined) => {
    if (date && activeFilter.type === "custom") {
      const newFilter = {
        type: "custom" as const,
        startDate: date,
        endDate: activeFilter.endDate,
      };
      handleFilterChange(newFilter);
      // Also notify parent if not using URL state
      if (!useUrlState && onFilterChange) {
        onFilterChange(newFilter);
      }
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date && activeFilter.type === "custom") {
      const newFilter = {
        type: "custom" as const,
        startDate: activeFilter.startDate,
        endDate: date,
      };
      handleFilterChange(newFilter);
      // Also notify parent if not using URL state
      if (!useUrlState && onFilterChange) {
        onFilterChange(newFilter);
      }
    }
  };

  // Get display value for current filter
  const getFilterDisplayValue = () => {
    if (activeFilter.type === "custom") {
      if (activeFilter.startDate && activeFilter.endDate) {
        return `${format(activeFilter.startDate, "MMM dd")} - ${format(
          activeFilter.endDate,
          "MMM dd, yyyy"
        )}`;
      }
      return "Custom Range";
    }

    const preset = PRESET_OPTIONS.find(
      (option) => option.value === activeFilter.type
    );
    return preset?.label || "Select Period";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="truncate">Filter by Date Range</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Preset Options Selector */}
        <div className="space-y-2">
          <label
            className="text-xs sm:text-sm font-medium text-muted-foreground"
            htmlFor="period-select"
          >
            Select Period
          </label>
          <Select
            value={activeFilter.type}
            onValueChange={handlePresetChange}
            disabled={isLoading}
          >
            <SelectTrigger
              id="period-select"
              className={cn(
                "w-full text-sm",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Select date range period"
              aria-describedby="period-help"
            >
              <SelectValue placeholder="Select a time period">
                <span className="truncate">{getFilterDisplayValue()}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              role="listbox"
              aria-label="Date range period options"
            >
              {PRESET_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer text-sm focus:bg-accent focus:text-accent-foreground"
                  role="option"
                  aria-label={`Select ${option.label} period`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div id="period-help" className="sr-only">
            Use arrow keys to navigate options, Enter to select, Escape to close
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {showCustomRange && (
          <fieldset className="space-y-4 pt-2 border-t">
            <legend className="sr-only">Custom date range selection</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label
                  className="text-xs sm:text-sm font-medium text-muted-foreground"
                  htmlFor="start-date-picker"
                >
                  Start Date
                </label>
                <AdvancedDatePicker
                  value={activeFilter.startDate}
                  onChange={handleStartDateChange}
                  placeholder="Select start date"
                  disabled={isLoading}
                  className="w-full text-sm"
                  fromYear={2020}
                  toYear={2030}
                />
                <div id="start-date-help" className="sr-only">
                  Select the beginning date for your custom date range
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-xs sm:text-sm font-medium text-muted-foreground"
                  htmlFor="end-date-picker"
                >
                  End Date
                </label>
                <AdvancedDatePicker
                  value={activeFilter.endDate}
                  onChange={handleEndDateChange}
                  placeholder="Select end date"
                  disabled={isLoading}
                  className="w-full text-sm"
                  fromYear={2020}
                  toYear={2030}
                />
                <div id="end-date-help" className="sr-only">
                  Select the ending date for your custom date range
                </div>
              </div>
            </div>

            {/* Custom Range Validation Message */}
            {activeFilter.startDate &&
              activeFilter.endDate &&
              activeFilter.startDate > activeFilter.endDate && (
                <div
                  className="text-xs sm:text-sm text-destructive bg-destructive/10 p-2 sm:p-3 rounded-md"
                  role="alert"
                  aria-live="polite"
                  aria-label="Date range validation error"
                >
                  End date must be after start date
                </div>
              )}

            {/* Custom Range Summary */}
            {activeFilter.startDate &&
              activeFilter.endDate &&
              activeFilter.startDate <= activeFilter.endDate && (
                <div
                  className="text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded-md"
                  role="status"
                  aria-live="polite"
                  aria-label="Selected date range summary"
                >
                  <span className="font-medium">Selected range:</span>{" "}
                  <span className="block sm:inline mt-1 sm:mt-0">
                    {format(activeFilter.startDate, "MMM dd, yyyy")} to{" "}
                    {format(activeFilter.endDate, "MMM dd, yyyy")}
                  </span>
                </div>
              )}
          </fieldset>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            className="flex items-center justify-center py-2"
            role="status"
            aria-live="polite"
            aria-label="Dashboard is updating"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <div
                className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              <span>Updating dashboard...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
