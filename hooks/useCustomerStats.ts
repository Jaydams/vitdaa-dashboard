"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCustomerStatsClient } from "@/actions/customer-actions-client";

interface CustomerStats {
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
}

export function useCustomerStats() {
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    newThisMonth: 0,
    activeThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getCustomerStatsClient();
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customer stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("customer-stats-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => {
          console.log("Customer stats realtime change:", payload);
          loadStats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("Order stats realtime change:", payload);
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats,
  };
} 