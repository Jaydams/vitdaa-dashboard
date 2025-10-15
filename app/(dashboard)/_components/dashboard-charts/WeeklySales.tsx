"use client";

import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";
import useGetMountStatus from "@/hooks/useGetMountStatus";
import { WeeklySalesData } from "@/types/dashboard";
import { ChartDescription } from "../ChartDescription";

interface WeeklySalesProps {
  data: WeeklySalesData;
  isLoading: boolean;
  error?: string;
}

export default function WeeklySales({
  data,
  isLoading,
  error,
}: WeeklySalesProps) {
  const { theme } = useTheme();
  const mounted = useGetMountStatus();

  const gridColor = `rgba(161, 161, 170, ${theme === "light" ? "0.5" : "0.3"})`;

  // Format currency values (amounts are stored as integers in kobo/cents)
  const formatCurrency = (value: number) => {
    return `₦${(value / 100).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Handle empty data state
  const hasData =
    data.labels.length > 0 &&
    (data.salesData.some((val) => val > 0) ||
      data.ordersData.some((val) => val > 0));

  // Show error state
  if (error) {
    return (
      <Card>
        <Typography variant="h3" className="mb-4">
          Weekly Sales
        </Typography>
        <CardContent className="pb-2">
          <div className="flex items-center justify-center h-60 text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Failed to load sales data</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" role="region" aria-labelledby="weekly-sales-title">
      <div className="p-4 sm:p-6">
        <h3
          id="weekly-sales-title"
          className="mb-4 text-lg sm:text-xl font-semibold"
        >
          Weekly Sales
        </h3>

        <CardContent className="pb-2 px-0">
          {!mounted ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
              <Skeleton className="h-48 sm:h-60 lg:h-64 w-full" />
            </div>
          ) : (
            <Tabs
              defaultValue="sales"
              aria-label="Weekly sales chart view options"
              suppressHydrationWarning
            >
              <TabsList
                className="mb-4 sm:mb-6 w-full sm:w-auto"
                role="tablist"
                aria-label="Chart data type selection"
                suppressHydrationWarning
              >
                <TabsTrigger
                  value="sales"
                  className="data-[state=active]:text-primary flex-1 sm:flex-none text-sm"
                  role="tab"
                  aria-controls="sales-chart"
                  aria-label="View sales data chart"
                  suppressHydrationWarning
                >
                  Sales
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="data-[state=active]:text-orange-500 flex-1 sm:flex-none text-sm"
                  role="tab"
                  aria-controls="orders-chart"
                  aria-label="View orders data chart"
                  suppressHydrationWarning
                >
                  Orders
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="sales"
                className="relative h-48 sm:h-60 lg:h-64"
                id="sales-chart"
                role="tabpanel"
                aria-labelledby="sales-tab"
                aria-label="Weekly sales line chart"
              >
                {isLoading ? (
                  <Skeleton
                    className="size-full"
                    aria-label="Loading sales chart"
                  />
                ) : !hasData ? (
                  <div
                    className="flex items-center justify-center h-full text-muted-foreground"
                    role="status"
                    aria-label="No sales data available"
                  >
                    <div className="text-center px-4">
                      <p className="text-sm">No sales data available</p>
                      <p className="text-xs mt-1">
                        Try selecting a different date range
                      </p>
                    </div>
                  </div>
                ) : mounted ? (
                  <div>
                    <ChartDescription
                      title="Weekly Sales"
                      data={data}
                      type="line"
                    />
                    <Line
                      data={{
                        labels: data.labels,
                        datasets: [
                          {
                            label: "Sales",
                            data: data.salesData.map((val) => val / 100), // Convert from kobo to naira for display
                            borderColor: "rgb(34, 197, 94)",
                            backgroundColor: "rgb(34, 197, 94)",
                            tension: 0.1,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        interaction: {
                          intersect: false,
                          mode: "index",
                        },
                        scales: {
                          y: {
                            grid: {
                              color: gridColor,
                            },
                            border: {
                              color: gridColor,
                            },
                            ticks: {
                              callback: function (value) {
                                return `₦${Number(value).toLocaleString(
                                  "en-NG"
                                )}`;
                              },
                              padding: 4,
                              maxTicksLimit: 6,
                            },
                            beginAtZero: true,
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              maxTicksLimit: 7,
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed.y;
                                return `${
                                  context.dataset.label
                                }: ₦${value.toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`;
                              },
                            },
                          },
                        },
                      }}
                    />
                    <ChartDescription
                      title="Weekly Sales"
                      data={data}
                      type="line"
                    />
                  </div>
                ) : (
                  <Skeleton className="size-full" />
                )}
              </TabsContent>

              <TabsContent
                value="orders"
                className="relative h-48 sm:h-60 lg:h-64"
                id="orders-chart"
                role="tabpanel"
                aria-labelledby="orders-tab"
                aria-label="Weekly orders line chart"
              >
                {isLoading ? (
                  <Skeleton
                    className="size-full"
                    aria-label="Loading orders chart"
                  />
                ) : !hasData ? (
                  <div
                    className="flex items-center justify-center h-full text-muted-foreground"
                    role="status"
                    aria-label="No order data available"
                  >
                    <div className="text-center px-4">
                      <p className="text-sm">No order data available</p>
                      <p className="text-xs mt-1">
                        Try selecting a different date range
                      </p>
                    </div>
                  </div>
                ) : mounted ? (
                  <div>
                    <Line
                      data={{
                        labels: data.labels,
                        datasets: [
                          {
                            label: "Orders",
                            data: data.ordersData,
                            borderColor: "rgb(249, 115, 22)",
                            backgroundColor: "rgb(249, 115, 22)",
                            tension: 0.1,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        interaction: {
                          intersect: false,
                          mode: "index",
                        },
                        scales: {
                          y: {
                            grid: {
                              color: gridColor,
                            },
                            border: {
                              color: gridColor,
                            },
                            ticks: {
                              stepSize: 1,
                              padding: 4,
                              maxTicksLimit: 6,
                            },
                            beginAtZero: true,
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              maxTicksLimit: 7,
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed.y;
                                return `${
                                  context.dataset.label
                                }: ${value} order${value !== 1 ? "s" : ""}`;
                              },
                            },
                          },
                        },
                      }}
                    />
                    <ChartDescription
                      title="Weekly Orders"
                      data={data}
                      type="line"
                    />
                  </div>
                ) : (
                  <Skeleton className="size-full" />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
