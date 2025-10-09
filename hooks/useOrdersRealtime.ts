"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types/order";
import { PaginationProps } from "@/types/pagination";
import { fetchOrders } from "@/actions/order-actions";

interface UseOrdersRealtimeProps {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  method?: string;
  limit?: string;
  startDate?: string;
  endDate?: string;
}

export function useOrdersRealtime({
  page = 1,
  perPage = 10,
  status,
  search,
  method,
  limit,
  startDate,
  endDate,
}: UseOrdersRealtimeProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationProps>({
    current: page,
    perPage: perPage,
    items: 0,
    pages: 1,
    first: 1,
    last: 1,
    next: null,
    prev: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchOrders({
        page,
        perPage,
        status: status as any,
        search,
        method: method as any,
        limit,
        startDate,
        endDate,
      });

      setOrders(result.data);

      // Transform pagination to match PaginationProps interface
      const transformedPagination = {
        current: result.pagination.page,
        perPage: result.pagination.perPage,
        items: result.pagination.total,
        pages: result.pagination.pages,
        first: 1,
        last: result.pagination.pages,
        next:
          result.pagination.page < result.pagination.pages
            ? result.pagination.page + 1
            : null,
        prev: result.pagination.page > 1 ? result.pagination.page - 1 : null,
      };

      setPagination(transformedPagination);
    } catch (err) {
      console.error("Error loading orders:", err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, perPage, status, search, method, limit, startDate, endDate]);

  useEffect(() => {
    // Subscribe to realtime changes on orders table
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Orders realtime change:", payload);

          // Reload orders when there are changes
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          console.log("Order items realtime change:", payload);

          // Reload orders when order items change
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        (payload) => {
          console.log("Payments realtime change:", payload);

          // Reload orders when payments change
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refresh = () => {
    loadOrders();
  };

  return {
    orders,
    pagination,
    loading,
    error,
    refresh,
  };
}
