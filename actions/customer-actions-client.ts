import { createClient } from "@/lib/supabase/client";
import { Customer, CreateCustomerData, UpdateCustomerData } from "@/types/customer";

export interface FetchCustomersParams {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FetchCustomersResult {
  data: Customer[];
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

export async function fetchCustomersClient({
  page = 1,
  perPage = 10,
  search = "",
  sortBy = "created_at",
  sortOrder = "desc",
}: FetchCustomersParams = {}): Promise<FetchCustomersResult> {
  try {
    const supabase = createClient();
    
    // Get the current user's business owner ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get business owner ID from the user's email
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner) {
      throw new Error("Business owner not found");
    }

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("business_id", businessOwner.id);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching customers:", error);
      throw new Error("Failed to fetch customers");
    }

    const total = count || 0;
    const pages = Math.ceil(total / perPage);

    return {
      data: data || [],
      total,
      pages,
      currentPage: page,
      perPage,
    };
  } catch (error) {
    console.error("Error in fetchCustomersClient:", error);
    throw new Error("Failed to fetch customers");
  }
}

export async function createCustomerClient(customerData: CreateCustomerData): Promise<Customer> {
  try {
    const supabase = createClient();
    
    // Get the current user's business owner ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get business owner ID from the user's email
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner) {
      throw new Error("Business owner not found");
    }

    // Check if customer with same phone already exists for this business
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessOwner.id)
      .eq("phone", customerData.phone)
      .single();

    if (existingCustomer) {
      throw new Error("Customer with this phone number already exists");
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: businessOwner.id,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || null,
        address: customerData.address || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      throw new Error("Failed to create customer");
    }

    return data;
  } catch (error) {
    console.error("Error in createCustomerClient:", error);
    throw error;
  }
}

export async function updateCustomerClient(id: string, customerData: UpdateCustomerData): Promise<Customer> {
  try {
    const supabase = createClient();
    
    // Get the current user's business owner ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get business owner ID from the user's email
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner) {
      throw new Error("Business owner not found");
    }

    // Check if customer exists and belongs to this business
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("business_id", businessOwner.id)
      .single();

    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    // If phone is being updated, check for duplicates
    if (customerData.phone) {
      const { data: duplicateCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessOwner.id)
        .eq("phone", customerData.phone)
        .neq("id", id)
        .single();

      if (duplicateCustomer) {
        throw new Error("Customer with this phone number already exists");
      }
    }

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("business_id", businessOwner.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      throw new Error("Failed to update customer");
    }

    return data;
  } catch (error) {
    console.error("Error in updateCustomerClient:", error);
    throw error;
  }
}

export async function deleteCustomerClient(id: string): Promise<void> {
  try {
    const supabase = createClient();
    
    // Get the current user's business owner ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get business owner ID from the user's email
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner) {
      throw new Error("Business owner not found");
    }

    // Check if customer exists and belongs to this business
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("business_id", businessOwner.id)
      .single();

    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("business_id", businessOwner.id);

    if (error) {
      console.error("Error deleting customer:", error);
      throw new Error("Failed to delete customer");
    }
  } catch (error) {
    console.error("Error in deleteCustomerClient:", error);
    throw error;
  }
}

export async function getCustomerStatsClient(): Promise<{
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
}> {
  try {
    const supabase = createClient();
    
    // Get the current user's business owner ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get business owner ID from the user's email
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner) {
      throw new Error("Business owner not found");
    }

    // Get total customers
    const { count: total } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwner.id);

    // Get customers created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwner.id)
      .gte("created_at", startOfMonth.toISOString());

    // Get customers with orders this month (active customers)
    const { count: activeThisMonth } = await supabase
      .from("orders")
      .select("customer_id", { count: "exact", head: true })
      .eq("business_id", businessOwner.id)
      .gte("created_at", startOfMonth.toISOString());

    return {
      total: total || 0,
      newThisMonth: newThisMonth || 0,
      activeThisMonth: activeThisMonth || 0,
    };
  } catch (error) {
    console.error("Error in getCustomerStatsClient:", error);
    return {
      total: 0,
      newThisMonth: 0,
      activeThisMonth: 0,
    };
  }
} 