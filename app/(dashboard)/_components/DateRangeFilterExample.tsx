"use client";

import React from "react";
import { DateRangeFilter } from "./DateRangeFilter";
import { DateFilter } from "@/types/dashboard";

/**
 * Example component showing how to use DateRangeFilter
 * This demonstrates both URL state management and controlled state usage
 */
export function DateRangeFilterExample() {
  const [controlledFilter, setControlledFilter] = React.useState<DateFilter>({
    type: "today",
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Date Range Filter with URL State Management
        </h2>
        <p className="text-muted-foreground mb-4">
          This filter automatically syncs with URL parameters and persists state
          across page reloads.
        </p>
        <DateRangeFilter useUrlState={true} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Date Range Filter with Controlled State
        </h2>
        <p className="text-muted-foreground mb-4">
          This filter uses controlled state and calls the onFilterChange
          callback. Current filter: {JSON.stringify(controlledFilter)}
        </p>
        <DateRangeFilter
          useUrlState={false}
          currentFilter={controlledFilter}
          onFilterChange={setControlledFilter}
        />
      </div>
    </div>
  );
}
