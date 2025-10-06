// Dashboard filter types
export interface DateFilter {
  type:
    | "today"
    | "yesterday"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "custom";
  startDate?: Date;
  endDate?: Date;
}

// Sales metrics
export interface SalesMetrics {
  today: number;
  yesterday: number;
  thisMonth: number;
  lastMonth: number;
  allTime: number;
}

// Order status metrics
export interface OrderStatusMetrics {
  total: number;
  pending: number;
  processing: number;
  delivered: number;
}

// Chart data types
export interface WeeklySalesData {
  labels: string[];
  salesData: number[];
  ordersData: number[];
}

export interface BestSellersData {
  labels: string[];
  data: number[];
  colors: string[];
}

// Additional analytics
export interface AdditionalMetrics {
  averageOrderValue: number;
  peakHours: { hour: number; count: number }[];
  uniqueCustomers: number;
  popularDiningOption: "indoor" | "delivery";
}

// Filter component props
export interface DateRangeFilterProps {
  onFilterChange: (filter: DateFilter) => void;
  currentFilter: DateFilter;
  isLoading?: boolean;
}

// Analytics component props
export interface SalesOverviewProps {
  data: SalesMetrics;
  isLoading: boolean;
  error?: string;
}

export interface StatusOverviewProps {
  data: OrderStatusMetrics;
  isLoading: boolean;
  error?: string;
}

export interface DashboardChartsProps {
  weeklySalesData: WeeklySalesData;
  bestSellersData: BestSellersData;
  isLoading: boolean;
  error?: string;
}
