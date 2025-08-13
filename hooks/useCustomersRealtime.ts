"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCustomersClient } from "@/actions/customer-actions-client";
import { Customer } from "@/types/customer";

interface UseCustomersRealtimeProps {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CustomersData {
  data: Customer[];
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

export function useCustomersRealtime({
  page = 1,
  perPage = 10,
  search = "",
  sortBy = "created_at",
  sortOrder = "desc",
}: UseCustomersRealtimeProps = {}) {
  const [customers, setCustomers] = useState<CustomersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchCustomersClient({
        page,
        perPage,
        search,
        sortBy,
        sortOrder,
      });
      setCustomers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, perPage, search, sortBy, sortOrder]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("customers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => {
          console.log("Customers realtime change:", payload);
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    customers,
    isLoading,
    error,
    refetch: loadCustomers,
  };
} 