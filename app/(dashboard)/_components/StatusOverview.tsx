import React from "react";
import {
  HiOutlineShoppingCart,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineExclamationCircle,
} from "react-icons/hi";
import { BsTruck } from "react-icons/bs";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Typography from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusOverviewProps } from "@/types/dashboard";

interface StatusCard {
  icon: React.ReactNode;
  title: string;
  value: number;
  className: string;
}

function StatusOverview({ data, isLoading, error }: StatusOverviewProps) {
  // Format count with proper number formatting
  const formatCount = (count: number): string => {
    return count.toLocaleString();
  };

  const cards: StatusCard[] = [
    {
      icon: <HiOutlineShoppingCart />,
      title: "Total Orders",
      value: data.total,
      className:
        "text-orange-600 dark:text-orange-100 bg-orange-100 dark:bg-orange-500",
    },
    {
      icon: <HiOutlineRefresh />,
      title: "Orders Pending",
      value: data.pending,
      className:
        "text-teal-600 dark:text-teal-100 bg-teal-100 dark:bg-teal-500",
    },
    {
      icon: <BsTruck />,
      title: "Orders Processing",
      value: data.processing,
      className:
        "text-blue-600 dark:text-blue-100 bg-blue-100 dark:bg-blue-500",
    },
    {
      icon: <HiOutlineCheck />,
      title: "Orders Delivered",
      value: data.delivered,
      className:
        "text-emerald-600 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-500",
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="transition-all duration-200 hover:shadow-md"
          >
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <Skeleton className="size-10 sm:size-12 rounded-full flex-shrink-0" />
              <div className="flex flex-col gap-y-1 flex-1 min-w-0">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="transition-all duration-200">
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="size-10 sm:size-12 rounded-full grid place-items-center bg-red-100 dark:bg-red-500 text-red-600 dark:text-red-100 flex-shrink-0">
                <HiOutlineExclamationCircle className="size-4 sm:size-5" />
              </div>
              <div className="flex flex-col gap-y-1 min-w-0">
                <Typography className="text-xs sm:text-sm text-muted-foreground truncate">
                  Error Loading
                </Typography>
                <Typography className="text-xl sm:text-2xl font-semibold text-popover-foreground">
                  --
                </Typography>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      role="region"
      aria-label="Order status overview"
    >
      {cards.map((card) => {
        const cardId = `status-card-${card.title
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

        return (
          <Card
            key={card.title}
            className="transition-all duration-200 hover:shadow-md hover:scale-105 focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-50"
            role="article"
            aria-labelledby={`${cardId}-title`}
            aria-describedby={`${cardId}-value`}
            tabIndex={0}
          >
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div
                className={cn(
                  "size-10 sm:size-12 rounded-full grid place-items-center [&>svg]:size-4 sm:[&>svg]:size-5 flex-shrink-0",
                  card.className
                )}
                role="img"
                aria-label={`${card.title} icon`}
                aria-hidden="true"
              >
                {card.icon}
              </div>

              <div className="flex flex-col gap-y-1 min-w-0">
                <h4
                  id={`${cardId}-title`}
                  className="text-xs sm:text-sm text-muted-foreground truncate"
                >
                  {card.title}
                </h4>

                <div
                  id={`${cardId}-value`}
                  className="text-xl sm:text-2xl font-semibold text-popover-foreground"
                  aria-label={`${card.title}: ${formatCount(card.value)} ${
                    card.value === 1 ? "order" : "orders"
                  }`}
                >
                  {formatCount(card.value)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
// Memoized export for performance optimization
export default React.memo(StatusOverview, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});
