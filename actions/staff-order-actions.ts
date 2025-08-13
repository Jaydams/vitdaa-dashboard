"use server";

import { createClient } from "@/lib/supabase/server";
import { validateStaffSession } from "@/actions/staff-auth-utils";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/types/order";

// Get staff session from cookies
async function getStaffSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const staffSessionToken = cookieStore.get("staff_session_token")?.value;

  if (!staffSessionToken) {
    throw new Error("No staff session found");
  }

  const sessionRecord = await validateStaffSession(staffSessionToken);
  if (!sessionRecord) {
    throw new Error("Invalid staff session");
  }

  return sessionRecord;
}

// Fetch orders for staff based on their role
export async function fetchStaffOrders({
  page = 1,
  perPage = 10,
  status,
  role,
  search,
}: {
  page?: number;
  perPage?: number;
  status?: OrderStatus;
  role: "reception" | "kitchen" | "bar" | "accountant";
  search?: string;
}) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        items:order_items(*),
        payment:payments(*),
        table:tables(id, table_number),
        delivery_location:delivery_locations(id, name, price),
        assigned_staff:staff!assigned_to_staff_id(id, first_name, last_name, role),
        status_updated_by_staff:staff!status_updated_by(id, first_name, last_name, role)
      `)
      .eq("business_id", sessionRecord.business_id)
      .order("created_at", { ascending: false });

    // Apply role-based filtering
    if (role === "kitchen") {
      query = query.eq("items.is_kitchen_item", true);
    } else if (role === "bar") {
      query = query.eq("items.is_bar_item", true);
    }

    // Apply status filter
    if (status) {
      query = query.eq("status", status);
    }

    // Apply search filter
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,invoice_no.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await query;

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: orders, error } = await query.range(from, to);

    if (error) {
      console.error("Error fetching staff orders:", error);
      throw new Error("Failed to fetch orders");
    }

    return {
      data: orders,
      pagination: {
        page,
        perPage,
        total: count || 0,
        pages: Math.ceil((count || 0) / perPage),
      },
    };
  } catch (error) {
    console.error("Error in fetchStaffOrders:", error);
    throw error;
  }
}

// Update order status with staff tracking
export async function updateOrderStatusStaff(
  orderId: string, 
  status: OrderStatus, 
  notes?: string
) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    // Update order status with staff information
    const { error } = await supabase
      .from("orders")
      .update({ 
        status,
        status_updated_by: sessionRecord.staff_id,
        last_status_update: new Date().toISOString(),
        ...(status === "processing" && { preparation_started_at: new Date().toISOString() }),
        ...(status === "delivered" && { preparation_completed_at: new Date().toISOString() }),
        ...(status === "ready" && { ready_for_pickup_at: new Date().toISOString() }),
      })
      .eq("id", orderId)
      .eq("business_id", sessionRecord.business_id);

    if (error) {
      console.error("Error updating order status:", error);
      throw new Error("Failed to update order status");
    }

    // Add manual status history entry if notes provided
    if (notes) {
      await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          staff_id: sessionRecord.staff_id,
          new_status: status,
          notes,
        });
    }

    revalidatePath("/staffs");
    return { success: true };
  } catch (error) {
    console.error("Error in updateOrderStatusStaff:", error);
    throw error;
  }
}

// Assign order to staff member
export async function assignOrderToStaff(
  orderId: string, 
  staffId: string, 
  assignmentType: "kitchen" | "bar" | "service" | "delivery",
  notes?: string
) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    // First, unassign any existing active assignments for this order and type
    await supabase
      .from("order_assignments")
      .update({
        is_active: false,
        unassigned_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .eq("assignment_type", assignmentType)
      .eq("is_active", true);

    // Create new assignment
    const { error: assignmentError } = await supabase
      .from("order_assignments")
      .insert({
        order_id: orderId,
        staff_id: staffId,
        assignment_type: assignmentType,
        notes,
      });

    if (assignmentError) {
      console.error("Error creating order assignment:", assignmentError);
      throw new Error("Failed to assign order");
    }

    // Update order with assigned staff
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        assigned_to_staff_id: staffId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("business_id", sessionRecord.business_id);

    if (orderError) {
      console.error("Error updating order assignment:", orderError);
      throw new Error("Failed to update order assignment");
    }

    revalidatePath("/staffs");
    return { success: true };
  } catch (error) {
    console.error("Error in assignOrderToStaff:", error);
    throw error;
  }
}

// Update order item status
export async function updateOrderItemStatus(
  itemId: string,
  status: "pending" | "preparing" | "ready" | "served" | "cancelled",
  notes?: string
) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    const updateData: any = {
      item_status: status,
      assigned_to_staff_id: sessionRecord.staff_id,
    };

    // Add timestamps based on status
    if (status === "preparing") {
      updateData.preparation_started_at = new Date().toISOString();
    } else if (status === "ready") {
      updateData.preparation_completed_at = new Date().toISOString();
    }

    if (notes) {
      updateData.special_instructions = notes;
    }

    const { error } = await supabase
      .from("order_items")
      .update(updateData)
      .eq("id", itemId);

    if (error) {
      console.error("Error updating order item status:", error);
      throw new Error("Failed to update item status");
    }

    revalidatePath("/staffs");
    return { success: true };
  } catch (error) {
    console.error("Error in updateOrderItemStatus:", error);
    throw error;
  }
}

// Add kitchen/bar notes to order
export async function addOrderNotes(
  orderId: string,
  noteType: "kitchen" | "bar",
  notes: string
) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    const updateData = noteType === "kitchen" 
      ? { kitchen_notes: notes }
      : { bar_notes: notes };

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("business_id", sessionRecord.business_id);

    if (error) {
      console.error("Error adding order notes:", error);
      throw new Error("Failed to add notes");
    }

    revalidatePath("/staffs");
    return { success: true };
  } catch (error) {
    console.error("Error in addOrderNotes:", error);
    throw error;
  }
}

// Set order priority level
export async function setOrderPriority(
  orderId: string,
  priority: "low" | "normal" | "high" | "urgent"
) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    const { error } = await supabase
      .from("orders")
      .update({ 
        priority_level: priority,
        status_updated_by: sessionRecord.staff_id,
      })
      .eq("id", orderId)
      .eq("business_id", sessionRecord.business_id);

    if (error) {
      console.error("Error setting order priority:", error);
      throw new Error("Failed to set priority");
    }

    revalidatePath("/staffs");
    return { success: true };
  } catch (error) {
    console.error("Error in setOrderPriority:", error);
    throw error;
  }
}

// Set estimated completion time
export async function setEstimatedCompletionTime(
  orderId: string,
  estimatedTime: string
) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    const { error } = await supabase
      .from("orders")
      .update({ 
        estimated_completion_time: estimatedTime,
        status_updated_by: sessionRecord.staff_id,
      })
      .eq("id", orderId)
      .eq("business_id", sessionRecord.business_id);

    if (error) {
      console.error("Error setting estimated completion time:", error);
      throw new Error("Failed to set estimated time");
    }

    revalidatePath("/staffs");
    return { success: true };
  } catch (error) {
    console.error("Error in setEstimatedCompletionTime:", error);
    throw error;
  }
}

// Get order status history
export async function getOrderStatusHistory(orderId: string) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("order_status_history")
      .select(`
        *,
        staff:staff_id(id, first_name, last_name, role)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching order status history:", error);
      throw new Error("Failed to fetch status history");
    }

    return data;
  } catch (error) {
    console.error("Error in getOrderStatusHistory:", error);
    throw error;
  }
}

// Get order assignments
export async function getOrderAssignments(orderId: string) {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("order_assignments")
      .select(`
        *,
        staff:staff_id(id, first_name, last_name, role)
      `)
      .eq("order_id", orderId)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching order assignments:", error);
      throw new Error("Failed to fetch assignments");
    }

    return data;
  } catch (error) {
    console.error("Error in getOrderAssignments:", error);
    throw error;
  }
}

// Get staff dashboard stats
export async function getStaffDashboardStats(role: "reception" | "kitchen" | "bar" | "accountant") {
  try {
    const sessionRecord = await getStaffSession();
    const supabase = await createClient();

    let baseQuery = supabase
      .from("orders")
      .select("*", { count: "exact" })
      .eq("business_id", sessionRecord.business_id);

    // Role-specific filtering
    if (role === "kitchen") {
      baseQuery = baseQuery.eq("items.is_kitchen_item", true);
    } else if (role === "bar") {
      baseQuery = baseQuery.eq("items.is_bar_item", true);
    }

    // Get counts for different statuses
    const [pendingOrders, processingOrders, readyOrders, completedOrders] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", sessionRecord.business_id).eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", sessionRecord.business_id).eq("status", "processing"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", sessionRecord.business_id).eq("status", "ready"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", sessionRecord.business_id).eq("status", "delivered"),
    ]);

    return {
      pending: pendingOrders.count || 0,
      processing: processingOrders.count || 0,
      ready: readyOrders.count || 0,
      completed: completedOrders.count || 0,
      total: (pendingOrders.count || 0) + (processingOrders.count || 0) + (readyOrders.count || 0) + (completedOrders.count || 0),
    };
  } catch (error) {
    console.error("Error in getStaffDashboardStats:", error);
    throw error;
  }
}
