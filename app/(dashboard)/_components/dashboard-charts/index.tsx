"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import WeeklySales from "./WeeklySales";
import BestSellers from "./BestSellers";
import { DashboardChartsProps } from "@/types/dashboard";

ChartJS.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  ArcElement,
  Legend,
  Tooltip
);

// Memoized chart components for better performance
const MemoizedWeeklySales = React.memo(WeeklySales);
const MemoizedBestSellers = React.memo(BestSellers);

function DashboardCharts({
  weeklySalesData,
  bestSellersData,
  isLoading,
  error,
}: DashboardChartsProps) {
  ChartJS.defaults.font.family = "'Poppins', sans-serif";
  ChartJS.defaults.font.size = 12;
  ChartJS.defaults.font.weight = "normal";
  ChartJS.defaults.responsive = true;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div className="w-full">
        <MemoizedWeeklySales
          data={weeklySalesData}
          isLoading={isLoading}
          error={error}
        />
      </div>
      <div className="w-full">
        <MemoizedBestSellers
          data={bestSellersData}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}

// Memoized export for performance optimization
export default React.memo(DashboardCharts, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    JSON.stringify(prevProps.weeklySalesData) ===
      JSON.stringify(nextProps.weeklySalesData) &&
    JSON.stringify(prevProps.bestSellersData) ===
      JSON.stringify(nextProps.bestSellersData)
  );
});
