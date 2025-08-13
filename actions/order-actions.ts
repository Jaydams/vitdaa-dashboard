"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { revalidatePath } from "next/cache";
import { Order, OrderStatus, OrderMethod } from "@/types/order";

export async function fetchOrders({
  page = 1,
  perPage = 10,
  status,
  search,
}: {
  page?: number;
  perPage?: number;
  status?: OrderStatus;
  search?: string;
}) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    let query = supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        items:order_items(*),
        payment:payments(*),
        table:tables(id, table_number),
        delivery_location:delivery_locations(id, name, price)
      `)
      .eq("business_id", businessOwnerId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,invoice_no.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await query;

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: orders, error } = await query
      .range(from, to);

    if (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Failed to fetch orders");
    }

    return {
      data: orders as Order[],
      pagination: {
        page,
        perPage,
        total: count || 0,
        pages: Math.ceil((count || 0) / perPage),
      },
    };
  } catch (error) {
    console.error("Error in fetchOrders:", error);
    throw error;
  }
}

export async function fetchOrder(id: string) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        items:order_items(*),
        payment:payments(*),
        table:tables(id, table_number),
        delivery_location:delivery_locations(id, name, price)
      `)
      .eq("id", id)
      .eq("business_id", businessOwnerId)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      throw new Error("Failed to fetch order");
    }

    return order as Order;
  } catch (error) {
    console.error("Error in fetchOrder:", error);
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // First, get the current order to check if it has a table
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("table_id, dining_option")
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
      throw new Error("Failed to fetch order");
    }

    // Update order status
    const { error } = await supabase
      .from("orders")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .eq("business_id", businessOwnerId);

    if (error) {
      console.error("Error updating order status:", error);
      throw new Error("Failed to update order status");
    }

    // Update table status if indoor dining and order is completed/cancelled
    if (currentOrder?.dining_option === "indoor" && currentOrder?.table_id) {
      if (status === "delivered" || status === "cancelled") {
        await updateTableStatus(currentOrder.table_id, "available");
      } else if (status === "processing") {
        await updateTableStatus(currentOrder.table_id, "occupied");
      }
    }

    revalidatePath("/orders");
    return { success: true };
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    throw error;
  }
}

export async function updateTableStatus(tableId: string, status: "available" | "occupied" | "reserved") {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase
      .from("tables")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", tableId);

    if (error) {
      console.error("Error updating table status:", error);
      throw new Error("Failed to update table status");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateTableStatus:", error);
    throw error;
  }
}

export async function createOrder(orderData: {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  dining_option: "indoor" | "delivery";
  table_id?: string;
  takeaway_packs: number;
  takeaway_pack_price: number;
  delivery_location_id?: string;
  delivery_fee: number;
  rider_name?: string;
  rider_phone?: string;
  payment_method: OrderMethod;
  items: Array<{
    menu_item_id: number;
    menu_item_name: string;
    menu_item_price: number;
    quantity: number;
    total_price: number;
  }>;
  subtotal: number;
  vat_amount: number;
  service_charge: number;
  total_amount: number;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // Start a transaction
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: businessOwnerId,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_address: orderData.customer_address,
        dining_option: orderData.dining_option,
        table_id: orderData.table_id,
        takeaway_packs: orderData.takeaway_packs,
        takeaway_pack_price: orderData.takeaway_pack_price,
        delivery_location_id: orderData.delivery_location_id,
        delivery_fee: orderData.delivery_fee,
        rider_name: orderData.rider_name,
        rider_phone: orderData.rider_phone,
        payment_method: orderData.payment_method,
        subtotal: orderData.subtotal,
        vat_amount: orderData.vat_amount,
        service_charge: orderData.service_charge,
        total_amount: orderData.total_amount,
        notes: orderData.notes,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw new Error("Failed to create order items");
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        amount: orderData.total_amount,
        payment_method: orderData.payment_method,
        status: orderData.payment_method === "cash" ? "completed" : "pending",
      });

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      throw new Error("Failed to create payment");
    }

    // Update table status if indoor dining
    if (orderData.dining_option === "indoor" && orderData.table_id) {
      await updateTableStatus(orderData.table_id, "occupied");
    }

    revalidatePath("/orders");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error in createOrder:", error);
    throw error;
  }
}

export async function getOrderStats() {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayOrders, error: todayError } = await supabase
      .from("orders")
      .select("total_amount, status")
      .eq("business_id", businessOwnerId)
      .gte("created_at", today.toISOString());

    if (todayError) {
      console.error("Error fetching today's orders:", todayError);
      throw new Error("Failed to fetch order stats");
    }

    // Get this month's orders
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const { data: monthOrders, error: monthError } = await supabase
      .from("orders")
      .select("total_amount, status")
      .eq("business_id", businessOwnerId)
      .gte("created_at", thisMonth.toISOString());

    if (monthError) {
      console.error("Error fetching month's orders:", monthError);
      throw new Error("Failed to fetch order stats");
    }

    const todayStats = {
      total: todayOrders?.length || 0,
      revenue: todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
      pending: todayOrders?.filter(order => order.status === "pending").length || 0,
      processing: todayOrders?.filter(order => order.status === "processing").length || 0,
      delivered: todayOrders?.filter(order => order.status === "delivered").length || 0,
    };

    const monthStats = {
      total: monthOrders?.length || 0,
      revenue: monthOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
    };

    return {
      today: todayStats,
      month: monthStats,
    };
  } catch (error) {
    console.error("Error in getOrderStats:", error);
    throw error;
  }
} 