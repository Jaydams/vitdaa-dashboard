"use client";

import React from "react";

interface ChartDescriptionProps {
  title: string;
  data: any;
  type: "line" | "pie";
  description?: string;
}

export function ChartDescription({
  title,
  data,
  type,
  description,
}: ChartDescriptionProps) {
  // Generate description for line charts
  const generateLineChartDescription = () => {
    if (!data.labels || (!data.salesData && !data.ordersData)) {
      return `${title}: No data available for the selected period.`;
    }

    const labels = data.labels;
    const values = data.salesData || data.ordersData || [];
    const total = values.reduce((sum: number, val: number) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const maxIndex = values.indexOf(max);
    const minIndex = values.indexOf(min);

    return `${title}: Chart showing data for ${labels.length} periods. 
      Total: ${total.toLocaleString()}, 
      Average: ${average.toFixed(2)}, 
      Highest value: ${max.toLocaleString()} on ${labels[maxIndex]}, 
      Lowest value: ${min.toLocaleString()} on ${labels[minIndex]}.`;
  };

  // Generate description for pie charts
  const generatePieChartDescription = () => {
    if (!data.labels || !data.data) {
      return `${title}: No data available for the selected period.`;
    }

    const labels = data.labels;
    const values = data.data;
    const total = values.reduce((sum: number, val: number) => sum + val, 0);

    const sortedItems = labels
      .map((label: string, index: number) => ({
        label,
        value: values[index],
        percentage: ((values[index] / total) * 100).toFixed(1),
      }))
      .sort((a: any, b: any) => b.value - a.value);

    const topItems = sortedItems.slice(0, 3);
    const topItemsText = topItems
      .map((item: any) => `${item.label}: ${item.value} (${item.percentage}%)`)
      .join(", ");

    return `${title}: Pie chart showing ${
      labels.length
    } items with total of ${total.toLocaleString()} units. 
      Top items: ${topItemsText}.`;
  };

  const chartDescription =
    description ||
    (type === "line"
      ? generateLineChartDescription()
      : generatePieChartDescription());

  return (
    <div
      className="sr-only"
      aria-label={`Chart description: ${chartDescription}`}
    >
      {chartDescription}
    </div>
  );
}
