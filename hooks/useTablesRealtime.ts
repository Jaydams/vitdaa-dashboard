"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
}

export function useTablesRealtime() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadTables = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current business owner ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Get business owner ID for the current user
      const { data: businessOwner } = await supabase
        .from("business_owner")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!businessOwner) {
        setError("Business owner not found");
        return;
      }

      const businessOwnerId = businessOwner.id;

      // Fetch tables for this business owner
      const { data, error: fetchError } = await supabase
        .from("tables")
        .select("id, table_number, capacity, status")
        .eq("restaurant_id", businessOwnerId)
        .order("table_number");

      if (fetchError) {
        console.error("Error fetching tables:", fetchError);
        setError("Failed to fetch tables");
        return;
      }

      setTables(data || []);
    } catch (err) {
      console.error("Error loading tables:", err);
      setError("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    // Subscribe to realtime changes on tables table
    const channel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        (payload) => {
          console.log('Tables realtime change:', payload);
          
          // Reload tables when there are changes
          loadTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refresh = () => {
    loadTables();
  };

  return {
    tables,
    loading,
    error,
    refresh,
  };
} 