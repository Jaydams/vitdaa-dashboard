import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
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

export async function fetchCustomers({
  page = 1,
  perPage = 10,
  search = "",
  sortBy = "created_at",
  sortOrder = "desc",
}: FetchCustomersParams = {}): Promise<FetchCustomersResult> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Business owner not found");
    }

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("business_id", businessOwnerId);

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
    console.error("Error in fetchCustomers:", error);
    throw new Error("Failed to fetch customers");
  }
}

export async function fetchCustomer(id: string): Promise<Customer | null> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Business owner not found");
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("business_id", businessOwnerId)
      .single();

    if (error) {
      console.error("Error fetching customer:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in fetchCustomer:", error);
    return null;
  }
}

export async function createCustomer(customerData: CreateCustomerData): Promise<Customer> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Business owner not found");
    }

    // Check if customer with same phone already exists for this business
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessOwnerId)
      .eq("phone", customerData.phone)
      .single();

    if (existingCustomer) {
      throw new Error("Customer with this phone number already exists");
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: businessOwnerId,
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
    console.error("Error in createCustomer:", error);
    throw error;
  }
}

export async function updateCustomer(id: string, customerData: UpdateCustomerData): Promise<Customer> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Business owner not found");
    }

    // Check if customer exists and belongs to this business
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("business_id", businessOwnerId)
      .single();

    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    // If phone is being updated, check for duplicates
    if (customerData.phone) {
      const { data: duplicateCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessOwnerId)
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
      .eq("business_id", businessOwnerId)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      throw new Error("Failed to update customer");
    }

    return data;
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    throw error;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Business owner not found");
    }

    // Check if customer exists and belongs to this business
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("business_id", businessOwnerId)
      .single();

    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("business_id", businessOwnerId);

    if (error) {
      console.error("Error deleting customer:", error);
      throw new Error("Failed to delete customer");
    }
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    throw error;
  }
}

export async function getCustomerStats(): Promise<{
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
}> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Business owner not found");
    }

    // Get total customers
    const { count: total } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwnerId);

    // Get customers created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwnerId)
      .gte("created_at", startOfMonth.toISOString());

    // Get customers with orders this month (active customers)
    const { count: activeThisMonth } = await supabase
      .from("orders")
      .select("customer_id", { count: "exact", head: true })
      .eq("business_id", businessOwnerId)
      .gte("created_at", startOfMonth.toISOString());

    return {
      total: total || 0,
      newThisMonth: newThisMonth || 0,
      activeThisMonth: activeThisMonth || 0,
    };
  } catch (error) {
    console.error("Error in getCustomerStats:", error);
    return {
      total: 0,
      newThisMonth: 0,
      activeThisMonth: 0,
    };
  }
} 