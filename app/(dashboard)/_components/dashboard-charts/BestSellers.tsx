"use client";

import { Pie } from "react-chartjs-2";
import { useTheme } from "next-themes";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";
import useGetMountStatus from "@/hooks/useGetMountStatus";
import { BestSellersData } from "@/types/dashboard";
import { ChartDescription } from "../ChartDescription";

interface BestSellersProps {
  data: BestSellersData;
  isLoading: boolean;
  error?: string;
}

export default function BestSellers({
  data,
  isLoading,
  error,
}: BestSellersProps) {
  const mounted = useGetMountStatus();
  const { theme } = useTheme();

  // Generate consistent colors for chart segments
  const generateColors = (count: number): string[] => {
    const baseColors = [
      "#FF6384", // Pink
      "#36A2EB", // Blue
      "#FFCE56", // Yellow
      "#4BC0C0", // Teal
      "#9966FF", // Purple
      "#FF9F40", // Orange
      "#FF6384", // Pink (repeat)
      "#C9CBCF", // Gray
      "#4BC0C0", // Teal (repeat)
      "#FF6384", // Pink (repeat)
    ];

    // If we have more items than base colors, generate additional colors
    const colors = [...baseColors];
    while (colors.length < count) {
      // Generate a random color
      const hue = Math.floor(Math.random() * 360);
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }

    return colors.slice(0, count);
  };

  // Check if we have data
  const hasData = data.labels.length > 0 && data.data.some((val) => val > 0);

  // Show error state
  if (error) {
    return (
      <Card>
        <Typography variant="h3" className="mb-4">
          Best Selling Products
        </Typography>
        <CardContent className="pb-2">
          <div className="flex items-center justify-center h-[18.625rem] text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Failed to load best sellers data</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" role="region" aria-labelledby="best-sellers-title">
      <div className="p-4 sm:p-6">
        <h3
          id="best-sellers-title"
          className="mb-4 text-lg sm:text-xl font-semibold"
        >
          Best Selling Products
        </h3>

        <CardContent className="pb-2 px-0">
          <div
            className="relative h-48 sm:h-60 lg:h-[18.625rem]"
            role="img"
            aria-label="Pie chart showing best selling products by quantity sold"
          >
            {isLoading ? (
              <Skeleton
                className="size-full"
                aria-label="Loading best sellers chart"
              />
            ) : !hasData ? (
              <div
                className="flex items-center justify-center h-full text-muted-foreground"
                role="status"
                aria-label="No best sellers data available"
              >
                <div className="text-center px-4">
                  <p className="text-sm">No best sellers data available</p>
                  <p className="text-xs mt-1">
                    Try selecting a different date range
                  </p>
                </div>
              </div>
            ) : mounted ? (
              <div>
                <Pie
                  data={{
                    labels: data.labels,
                    datasets: [
                      {
                        label: "Quantity Sold",
                        data: data.data,
                        backgroundColor:
                          data.colors.length > 0
                            ? data.colors
                            : generateColors(data.labels.length),
                        borderColor:
                          theme === "light"
                            ? "rgb(255,255,255)"
                            : "rgb(23,23,23)",
                        borderWidth: 2,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "bottom" as const,
                        labels: {
                          padding: 15,
                          usePointStyle: true,
                          font: {
                            size: 10,
                          },
                          boxWidth: 12,
                          boxHeight: 12,
                          generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels && data.datasets.length) {
                              return data.labels.map((label, i) => {
                                const dataset = data.datasets[0];
                                const value = dataset.data[i] as number;
                                // Truncate long labels on mobile
                                const truncatedLabel =
                                  typeof label === "string" && label.length > 15
                                    ? `${label.substring(0, 12)}...`
                                    : label;
                                return {
                                  text: `${truncatedLabel}: ${value}`,
                                  fillStyle: Array.isArray(
                                    dataset.backgroundColor
                                  )
                                    ? (dataset.backgroundColor[i] as string)
                                    : (dataset.backgroundColor as string),
                                  strokeStyle: dataset.borderColor as string,
                                  lineWidth: dataset.borderWidth as number,
                                  hidden: false,
                                  index: i,
                                };
                              });
                            }
                            return [];
                          },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || "";
                            const value = context.parsed;
                            const total = context.dataset.data.reduce(
                              (sum: number, val) => sum + (val as number),
                              0
                            );
                            const percentage =
                              total > 0
                                ? ((value / total) * 100).toFixed(1)
                                : "0";
                            return `${label}: ${value} (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
                <ChartDescription
                  title="Best Selling Products"
                  data={data}
                  type="pie"
                />
              </div>
            ) : (
              <Skeleton className="size-full" />
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
