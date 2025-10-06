"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

// Types for dashboard data
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

export interface SalesMetrics {
  today: number;
  yesterday: number;
  thisMonth: number;
  lastMonth: number;
  allTime: number;
}

export interface OrderStatusMetrics {
  total: number;
  pending: number;
  processing: number;
  delivered: number;
}

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

export interface AdditionalMetrics {
  averageOrderValue: number;
  peakHours: { hour: number; count: number }[];
  uniqueCustomers: number;
  popularDiningOption: "indoor" | "delivery";
}

// Helper function to get date ranges
function getDateRange(filter: DateFilter): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (filter.type) {
    case "today":
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
      break;

    case "yesterday":
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 1,
          0,
          0,
          0,
          0
        )
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 1,
          23,
          59,
          59,
          999
        )
      );
      break;

    case "this_week":
      const dayOfWeek = now.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysToMonday,
          0,
          0,
          0,
          0
        )
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
      break;

    case "last_week":
      const lastWeekDayOfWeek = now.getUTCDay();
      const daysToLastMonday =
        lastWeekDayOfWeek === 0 ? 13 : lastWeekDayOfWeek + 6;
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysToLastMonday,
          0,
          0,
          0,
          0
        )
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysToLastMonday + 6,
          23,
          59,
          59,
          999
        )
      );
      break;

    case "this_month":
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )
      );
      break;

    case "last_month":
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
      );
      endDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)
      );
      break;

    case "custom":
      if (!filter.startDate || !filter.endDate) {
        throw new Error("Custom date range requires startDate and endDate");
      }
      startDate = new Date(filter.startDate);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(filter.endDate);
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    default:
      throw new Error("Invalid filter type");
  }

  return { startDate, endDate };
}

/**
 * Get sales metrics for different time periods
 * When filter is provided, it shows filtered data for all metrics
 * When no filter is provided, it shows the standard time periods
 */
export async function getSalesMetrics(
  filter?: DateFilter
): Promise<SalesMetrics> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized: Business owner not found");
    }

    const now = new Date();

    // Debug logging
    console.log("getSalesMetrics - Business Owner ID:", businessOwnerId);
    console.log("getSalesMetrics - Current date:", now.toISOString());
    console.log("getSalesMetrics - Current month/year:", {
      month: now.getMonth(),
      year: now.getFullYear(),
    });

    // Test query to see all orders for this business
    const { data: testOrders, error: testError } = await supabase
      .from("orders")
      .select("id, total_amount, created_at, status, invoice_no, business_id")
      .eq("business_id", businessOwnerId)
      .order("created_at", { ascending: false })
      .limit(10);

    console.log("Test query - Recent orders:", {
      businessOwnerId,
      count: testOrders?.length || 0,
      orders: testOrders?.map((o) => ({
        invoice: o.invoice_no,
        amount: o.total_amount,
        status: o.status,
        date: o.created_at,
        businessId: o.business_id,
      })),
    });

    // Also check status distribution
    const { data: statusCheck, error: statusError } = await supabase
      .from("orders")
      .select("status, total_amount")
      .eq("business_id", businessOwnerId);

    if (!statusError && statusCheck) {
      const statusStats = statusCheck.reduce((acc, order) => {
        const status = order.status || "unknown";
        if (!acc[status]) {
          acc[status] = { count: 0, totalAmount: 0 };
        }
        acc[status].count++;
        acc[status].totalAmount += order.total_amount || 0;
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>);

      console.log("Status distribution:", statusStats);
    }

    // Check if a custom filter is applied
    let customRangeTotal = 0;
    if (filter && filter.type === "custom") {
      const { startDate, endDate } = getDateRange(filter);

      console.log("Custom filter detected:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Get data for the custom range
      const { data: customData, error: customError } = await supabase
        .from("orders")
        .select("total_amount, created_at, status")
        .eq("business_id", businessOwnerId)
        .in("status", ["delivered"])
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (!customError && customData) {
        customRangeTotal = customData.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        );
        console.log("Custom range total:", {
          count: customData.length,
          total: customRangeTotal,
        });
      }
    }

    // Default behavior: show actual time periods when no filter is provided
    // Today's sales - Use UTC to avoid timezone issues
    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const todayEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    const { data: todayData, error: todayError } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("business_id", businessOwnerId)
      .in("status", ["delivered"])
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString());

    if (todayError) {
      console.error("Error fetching today's sales:", todayError);
      throw new Error("Failed to fetch today's sales");
    }

    // Yesterday's sales - Use UTC to avoid timezone issues
    const yesterdayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 1,
        0,
        0,
        0,
        0
      )
    );
    const yesterdayEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 1,
        23,
        59,
        59,
        999
      )
    );

    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("business_id", businessOwnerId)
      .in("status", ["delivered"])
      .gte("created_at", yesterdayStart.toISOString())
      .lte("created_at", yesterdayEnd.toISOString());

    if (yesterdayError) {
      console.error("Error fetching yesterday's sales:", yesterdayError);
      throw new Error("Failed to fetch yesterday's sales");
    }

    // This month's sales (October 2025) - Use UTC to avoid timezone issues
    const thisMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const thisMonthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );

    console.log("This month calculation (FIXED):", {
      currentMonth: now.getUTCMonth(), // 9 = October (0-indexed)
      currentYear: now.getUTCFullYear(),
      thisMonthStart: thisMonthStart.toISOString(),
      thisMonthEnd: thisMonthEnd.toISOString(),
    });

    const { data: thisMonthData, error: thisMonthError } = await supabase
      .from("orders")
      .select("total_amount, created_at, status")
      .eq("business_id", businessOwnerId)
      .in("status", ["delivered"])
      .gte("created_at", thisMonthStart.toISOString())
      .lte("created_at", thisMonthEnd.toISOString());

    if (thisMonthError) {
      console.error("Error fetching this month's sales:", thisMonthError);
      throw new Error("Failed to fetch this month's sales");
    }

    // Debug logging
    console.log("This month date range (FIXED):", {
      start: thisMonthStart.toISOString(),
      end: thisMonthEnd.toISOString(),
      dataCount: thisMonthData?.length || 0,
    });

    // Last month's sales (September 2025) - Use UTC to avoid timezone issues
    const lastMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    );
    const lastMonthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)
    );

    console.log("Last month calculation (FIXED):", {
      lastMonthIndex: now.getUTCMonth() - 1, // 8 = September (0-indexed)
      lastMonthStart: lastMonthStart.toISOString(),
      lastMonthEnd: lastMonthEnd.toISOString(),
    });

    // Query for last month with more detailed debugging
    const { data: lastMonthData, error: lastMonthError } = await supabase
      .from("orders")
      .select("total_amount, created_at, status, invoice_no")
      .eq("business_id", businessOwnerId)
      .in("status", ["delivered"])
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    // Also query ALL orders in last month range (regardless of status) for debugging
    const { data: lastMonthAllData, error: lastMonthAllError } = await supabase
      .from("orders")
      .select("total_amount, created_at, status, invoice_no")
      .eq("business_id", businessOwnerId)
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    console.log("Last month ALL orders (any status):", {
      count: lastMonthAllData?.length || 0,
    });

    if (lastMonthError) {
      console.error("Error fetching last month's sales:", lastMonthError);
      console.error("Date range:", {
        lastMonthStart: lastMonthStart.toISOString(),
        lastMonthEnd: lastMonthEnd.toISOString(),
      });
      throw new Error("Failed to fetch last month's sales");
    }

    // Debug logging
    console.log("Last month date range:", {
      start: lastMonthStart.toISOString(),
      end: lastMonthEnd.toISOString(),
      dataCount: lastMonthData?.length || 0,
      sampleData: lastMonthData?.slice(0, 3),
    });

    // All-time sales
    const { data: allTimeData, error: allTimeError } = await supabase
      .from("orders")
      .select("total_amount, created_at, status, invoice_no")
      .eq("business_id", businessOwnerId)
      .in("status", ["delivered"]);

    // Also query ALL orders (any status) for comparison
    const { data: allTimeAllData, error: allTimeAllError } = await supabase
      .from("orders")
      .select("total_amount, created_at, status, invoice_no")
      .eq("business_id", businessOwnerId)
      .limit(20); // Limit to avoid too much data

    console.log("All-time orders comparison:", {
      deliveredCount: allTimeData?.length || 0,
      allStatusCount: allTimeAllData?.length || 0,
    });

    if (allTimeError) {
      console.error("Error fetching all-time sales:", allTimeError);
      throw new Error("Failed to fetch all-time sales");
    }

    // Debug logging
    console.log("All-time sales data:", {
      dataCount: allTimeData?.length || 0,
      sampleData: allTimeData?.slice(0, 5),
      totalSum:
        allTimeData?.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        ) || 0,
    });

    // Calculate totals (amounts are stored as integers in kobo/cents)
    const today =
      todayData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ||
      0;
    const yesterday =
      yesterdayData?.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ) || 0;
    const thisMonth =
      thisMonthData?.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ) || 0;
    const lastMonth =
      lastMonthData?.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ) || 0;
    const allTime =
      allTimeData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ||
      0;

    // Debug final calculations
    console.log("Final calculations:", {
      today: { count: todayData?.length || 0, total: today },
      yesterday: { count: yesterdayData?.length || 0, total: yesterday },
      thisMonth: { count: thisMonthData?.length || 0, total: thisMonth },
      lastMonth: { count: lastMonthData?.length || 0, total: lastMonth },
      allTime: { count: allTimeData?.length || 0, total: allTime },
    });

    // If custom filter is applied, show the custom range total in the "All-Time Sales" card
    // and set others to 0 to indicate they're not relevant for the custom range
    if (filter && filter.type === "custom") {
      return {
        today: 0,
        yesterday: 0,
        thisMonth: 0,
        lastMonth: 0,
        allTime: customRangeTotal, // Show custom range total here
      };
    }

    return {
      today,
      yesterday,
      thisMonth,
      lastMonth,
      allTime,
    };
  } catch (error) {
    console.error("Error in getSalesMetrics:", error);
    // Return fallback values on error
    return {
      today: 0,
      yesterday: 0,
      thisMonth: 0,
      lastMonth: 0,
      allTime: 0,
    };
  }
}

/**
 * Get order status metrics for a given time period
 */
export async function getOrderStatusMetrics(
  filter?: DateFilter
): Promise<OrderStatusMetrics> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized: Business owner not found");
    }

    let query = supabase
      .from("orders")
      .select("status")
      .eq("business_id", businessOwnerId);

    // Apply date filter if provided
    if (filter) {
      const { startDate, endDate } = getDateRange(filter);
      query = query
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching order status metrics:", error);
      throw new Error("Failed to fetch order status metrics");
    }

    // Count orders by status
    const total = orders?.length || 0;
    const pending =
      orders?.filter((order) => order.status === "pending").length || 0;
    const processing =
      orders?.filter((order) => order.status === "processing").length || 0;
    const delivered =
      orders?.filter((order) => order.status === "delivered").length || 0;

    return {
      total,
      pending,
      processing,
      delivered,
    };
  } catch (error) {
    console.error("Error in getOrderStatusMetrics:", error);
    // Return fallback values on error
    return {
      total: 0,
      pending: 0,
      processing: 0,
      delivered: 0,
    };
  }
}

/**
 * Get weekly sales data for charts
 */
export async function getWeeklySalesData(
  filter?: DateFilter
): Promise<WeeklySalesData> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized: Business owner not found");
    }

    // Default to last 7 days if no filter provided
    let startDate: Date;
    let endDate: Date;

    if (filter) {
      const dateRange = getDateRange(filter);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("created_at, total_amount, status")
      .eq("business_id", businessOwnerId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching weekly sales data:", error);
      throw new Error("Failed to fetch weekly sales data");
    }

    // Generate date labels for the range
    const labels: string[] = [];
    const salesByDate: { [key: string]: number } = {};
    const ordersByDate: { [key: string]: number } = {};

    // Initialize all dates in range with zero values
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      labels.push(
        currentDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      );
      salesByDate[dateKey] = 0;
      ordersByDate[dateKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate data by date
    orders?.forEach((order) => {
      const orderDate = new Date(order.created_at).toISOString().split("T")[0];

      if (salesByDate.hasOwnProperty(orderDate)) {
        ordersByDate[orderDate] += 1;

        // Only count sales for delivered orders
        if (order.status === "delivered") {
          salesByDate[orderDate] += order.total_amount || 0;
        }
      }
    });

    // Convert to arrays in the same order as labels
    const salesData: number[] = [];
    const ordersData: number[] = [];

    const currentDateForData = new Date(startDate);
    for (let i = 0; i < labels.length; i++) {
      const dateKey = currentDateForData.toISOString().split("T")[0];
      salesData.push(salesByDate[dateKey] || 0);
      ordersData.push(ordersByDate[dateKey] || 0);
      currentDateForData.setDate(currentDateForData.getDate() + 1);
    }

    return {
      labels,
      salesData,
      ordersData,
    };
  } catch (error) {
    console.error("Error in getWeeklySalesData:", error);
    // Return fallback empty data
    return {
      labels: [],
      salesData: [],
      ordersData: [],
    };
  }
}

/**
 * Get best sellers data for pie chart
 */
export async function getBestSellersData(
  filter?: DateFilter
): Promise<BestSellersData> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized: Business owner not found");
    }

    let query = supabase
      .from("order_items")
      .select(
        `
        menu_item_name,
        quantity,
        order:orders!inner(
          business_id,
          status,
          created_at
        )
      `
      )
      .eq("order.business_id", businessOwnerId)
      .in("order.status", ["delivered"]);

    // Apply date filter if provided
    if (filter) {
      const { startDate, endDate } = getDateRange(filter);
      query = query
        .gte("order.created_at", startDate.toISOString())
        .lte("order.created_at", endDate.toISOString());
    }

    const { data: orderItems, error } = await query;

    if (error) {
      console.error("Error fetching best sellers data:", error);
      throw new Error("Failed to fetch best sellers data");
    }

    // Aggregate quantities by menu item
    const itemQuantities: { [key: string]: number } = {};

    orderItems?.forEach((item) => {
      const itemName = item.menu_item_name;
      itemQuantities[itemName] =
        (itemQuantities[itemName] || 0) + (item.quantity || 0);
    });

    // Sort by quantity and take top 10
    const sortedItems = Object.entries(itemQuantities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Generate colors for chart segments
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#FF6384",
      "#C9CBCF",
      "#4BC0C0",
      "#FF6384",
    ];

    const labels = sortedItems.map(([name]) => name);
    const data = sortedItems.map(([, quantity]) => quantity);
    const chartColors = colors.slice(0, labels.length);

    return {
      labels,
      data,
      colors: chartColors,
    };
  } catch (error) {
    console.error("Error in getBestSellersData:", error);
    // Return fallback empty data
    return {
      labels: [],
      data: [],
      colors: [],
    };
  }
}
/**
 * Get additional analytics metrics
 */
export async function getAdditionalMetrics(
  filter?: DateFilter
): Promise<AdditionalMetrics> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized: Business owner not found");
    }

    let query = supabase
      .from("orders")
      .select(
        "total_amount, created_at, dining_option, customer_name, customer_phone, status"
      )
      .eq("business_id", businessOwnerId)
      .in("status", ["delivered"]);

    // Apply date filter if provided
    if (filter) {
      const { startDate, endDate } = getDateRange(filter);
      query = query
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching additional metrics:", error);
      throw new Error("Failed to fetch additional metrics");
    }

    if (!orders || orders.length === 0) {
      return {
        averageOrderValue: 0,
        peakHours: [],
        uniqueCustomers: 0,
        popularDiningOption: "indoor",
      };
    }

    // Calculate average order value
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );
    const averageOrderValue =
      orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate peak hours
    const hourCounts: { [hour: number]: number } = {};
    orders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 peak hours

    // Calculate unique customers (using phone number as identifier)
    const uniquePhones = new Set();
    orders.forEach((order) => {
      if (order.customer_phone) {
        uniquePhones.add(order.customer_phone);
      }
    });
    const uniqueCustomers = uniquePhones.size;

    // Calculate popular dining option
    const diningOptionCounts = {
      indoor: orders.filter((order) => order.dining_option === "indoor").length,
      delivery: orders.filter((order) => order.dining_option === "delivery")
        .length,
    };
    const popularDiningOption =
      diningOptionCounts.indoor >= diningOptionCounts.delivery
        ? "indoor"
        : "delivery";

    return {
      averageOrderValue,
      peakHours,
      uniqueCustomers,
      popularDiningOption,
    };
  } catch (error) {
    console.error("Error in getAdditionalMetrics:", error);
    // Return fallback values on error
    return {
      averageOrderValue: 0,
      peakHours: [],
      uniqueCustomers: 0,
      popularDiningOption: "indoor",
    };
  }
}

/**
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics(filter?: DateFilter) {
  try {
    // Fetch all metrics in parallel for better performance
    const [sales, orders, weeklySales, bestSellers, additional] =
      await Promise.all([
        getSalesMetrics(filter),
        getOrderStatusMetrics(filter),
        getWeeklySalesData(filter),
        getBestSellersData(filter),
        getAdditionalMetrics(filter),
      ]);

    return {
      sales,
      orders,
      charts: {
        weeklySales,
        bestSellers,
      },
      additional,
    };
  } catch (error) {
    console.error("Error in getDashboardMetrics:", error);
    throw error;
  }
}
