import React from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { HiOutlineSquare3Stack3D, HiCalendarDays } from "react-icons/hi2";
import { HiExclamationTriangle } from "react-icons/hi2";

import { cn } from "@/lib/utils";
import Typography from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesMetrics, DateFilter } from "@/types/dashboard";
import { formatCurrency } from "@/lib/dashboard-utils";

interface SalesOverviewProps {
  data?: SalesMetrics;
  isLoading: boolean;
  error?: string;
  filter?: DateFilter;
}

interface SalesCard {
  icon: React.ReactNode;
  title: string;
  value: number;
  className: string;
}

function SalesOverview({ data, isLoading, error, filter }: SalesOverviewProps) {
  // Helper function to safely get numeric values with zero fallback
  const getSafeValue = (value: number | undefined | null): number => {
    return typeof value === "number" && !isNaN(value) ? value : 0;
  };

  // Define card configuration with dynamic values based on filter
  const isCustomFilter = filter && filter.type === "custom";

  // Generate title for custom range
  const getCustomRangeTitle = () => {
    if (
      filter &&
      filter.type === "custom" &&
      filter.startDate &&
      filter.endDate
    ) {
      const start = new Date(filter.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const end = new Date(filter.endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${start} - ${end}`;
    }
    return "Selected Range";
  };

  const cards: SalesCard[] = isCustomFilter
    ? [
        // For custom filters, show only the filtered range total
        {
          icon: <HiCalendarDays />,
          title: getCustomRangeTitle(),
          value: getSafeValue(data?.allTime), // Custom range total is stored in allTime
          className: "bg-emerald-600",
        },
      ]
    : [
        // Default cards for no filter or standard filters
        {
          icon: <HiOutlineSquare3Stack3D />,
          title: "Today Orders",
          value: getSafeValue(data?.today),
          className: "bg-teal-600",
        },
        {
          icon: <HiOutlineSquare3Stack3D />,
          title: "Yesterday Orders",
          value: getSafeValue(data?.yesterday),
          className: "bg-orange-400",
        },
        {
          icon: <HiOutlineRefresh />,
          title: "This Month",
          value: getSafeValue(data?.thisMonth),
          className: "bg-blue-500",
        },
        {
          icon: <HiCalendarDays />,
          title: "Last Month",
          value: getSafeValue(data?.lastMonth),
          className: "bg-cyan-600",
        },
        {
          icon: <HiCalendarDays />,
          title: "All-Time Sales",
          value: getSafeValue(data?.allTime),
          className: "bg-emerald-600",
        },
      ];

  // Loading state
  if (isLoading) {
    const cardCount = isCustomFilter ? 1 : 5;
    const gridCols = isCustomFilter
      ? "grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

    return (
      <div
        className={`grid ${gridCols} gap-3 sm:gap-4 ${
          isCustomFilter ? "justify-center" : ""
        }`}
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <div
            key={`sales-skeleton-${index}`}
            className="p-4 sm:p-6 rounded-lg flex flex-col items-center justify-center space-y-3 bg-gray-100 min-h-[120px] sm:min-h-[140px]"
          >
            <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-md" />
            <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
            <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    const cardCount = isCustomFilter ? 1 : 5;
    const gridCols = isCustomFilter
      ? "grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

    return (
      <div
        className={`grid ${gridCols} gap-3 sm:gap-4 ${
          isCustomFilter ? "justify-center" : ""
        }`}
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <div
            key={`sales-error-${index}`}
            className="p-4 sm:p-6 rounded-lg flex flex-col items-center justify-center space-y-3 bg-red-50 border border-red-200 text-red-600 min-h-[120px] sm:min-h-[140px]"
          >
            <HiExclamationTriangle className="h-6 w-6 sm:h-8 sm:w-8" />
            <Typography className="text-xs sm:text-sm text-center">
              Failed to load
            </Typography>
            <Typography className="text-xs text-center opacity-75">
              {formatCurrency(0)}
            </Typography>
          </div>
        ))}
      </div>
    );
  }

  const gridCols = isCustomFilter
    ? "grid-cols-1"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

  return (
    <section
      className={`grid ${gridCols} gap-3 sm:gap-4 ${
        isCustomFilter ? "justify-center" : ""
      }`}
      role="region"
      aria-label="Sales overview metrics"
    >
      {cards.map((card, index) => {
        const isZeroValue = card.value === 0;
        const cardId = `sales-card-${index}`;

        return (
          <div
            key={`sales-overview-${index}`}
            id={cardId}
            className={cn(
              "p-4 sm:p-6 rounded-lg flex flex-col items-center justify-center space-y-2 sm:space-y-3 text-white text-center min-h-[120px] sm:min-h-[140px] transition-all duration-200 hover:scale-105 focus-within:ring-2 focus-within:ring-white focus-within:ring-opacity-50",
              card.className,
              isZeroValue && "opacity-75"
            )}
            role="article"
            aria-labelledby={`${cardId}-title`}
            aria-describedby={`${cardId}-value ${
              isZeroValue ? `${cardId}-status` : ""
            }`}
            tabIndex={0}
          >
            <div
              className="[&>svg]:size-6 sm:[&>svg]:size-8"
              aria-hidden="true"
              role="img"
              aria-label={`${card.title} icon`}
            >
              {card.icon}
            </div>

            <h4
              id={`${cardId}-title`}
              className="text-sm sm:text-base font-medium"
            >
              {card.title}
            </h4>

            <div
              id={`${cardId}-value`}
              className="text-lg sm:text-2xl font-semibold"
              aria-label={`${card.title} amount: ${formatCurrency(card.value)}`}
            >
              {formatCurrency(card.value)}
            </div>

            {isZeroValue && (
              <div
                id={`${cardId}-status`}
                className="text-xs opacity-60"
                aria-label="No sales recorded for this period"
              >
                No sales yet
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// Memoized export for performance optimization
export default React.memo(SalesOverview, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});
