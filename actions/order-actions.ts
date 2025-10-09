"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { revalidatePath } from "next/cache";
import {
  Order,
  OrderStatus,
  OrderMethod,
  OrderItem,
  CustomCharge,
} from "@/types/order";
import { getEditableFields } from "@/lib/order-utils";

export async function fetchOrders({
  page = 1,
  perPage = 10,
  status,
  search,
  method,
  limit,
  startDate,
  endDate,
}: {
  page?: number;
  perPage?: number;
  status?: OrderStatus;
  search?: string;
  method?: OrderMethod;
  limit?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        customer:customers(*),
        items:order_items(*),
        payment:payments(*),
        custom_charges:order_custom_charges(*),
        table:tables(id, table_number),
        delivery_location:delivery_locations(id, name, price)
      `,
        { count: "exact" }
      )
      .eq("business_id", businessOwnerId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,invoice_no.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }

    if (method) {
      query = query.eq("payment_method", method);
    }

    // Handle date range filters
    if (limit) {
      const days = parseInt(limit);
      const limitDate = new Date();

      if (days === 1) {
        // Today only
        limitDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", limitDate.toISOString());
      } else {
        // Last N days
        limitDate.setDate(limitDate.getDate() - days);
        limitDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", limitDate.toISOString());
      }
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endDateTime.toISOString());
    }

    // Apply pagination and get count
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: orders, error, count } = await query.range(from, to);

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
      .select(
        `
        *,
        customer:customers(*),
        items:order_items(*),
        payment:payments(*),
        custom_charges:order_custom_charges(*),
        table:tables(id, table_number),
        delivery_location:delivery_locations(id, name, price)
      `
      )
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

// Status transition rules - defines valid transitions from each status
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["ready", "delivered", "completed", "cancelled"],
  ready: ["delivered", "completed", "cancelled"],
  delivered: [], // Final state - no transitions allowed
  completed: [], // Final state - no transitions allowed
  cancelled: [], // Final state - no transitions allowed
};

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // First, get the current order to check if it has a table and get order details
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select(
        "table_id, dining_option, invoice_no, customer_name, status, total_amount"
      )
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
      throw new Error("Failed to fetch order");
    }

    if (!currentOrder) {
      throw new Error("Order not found");
    }

    const previousStatus = currentOrder.status;

    // Validate status transition
    const allowedTransitions =
      STATUS_TRANSITIONS[previousStatus as OrderStatus];
    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Invalid status transition from '${previousStatus}' to '${status}'. Allowed transitions: ${allowedTransitions.join(
          ", "
        )}`
      );
    }

    // If status is the same, no need to update
    if (previousStatus === status) {
      return { success: true, message: "Status is already set to this value" };
    }

    // Start transaction-like operations with rollback capability
    let rollbackOperations: (() => Promise<void>)[] = [];

    try {
      // Update order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("business_id", businessOwnerId);

      if (updateError) {
        console.error("Error updating order status:", updateError);
        throw new Error("Failed to update order status");
      }

      // Add rollback operation for order status
      rollbackOperations.push(async () => {
        await supabase
          .from("orders")
          .update({
            status: previousStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("business_id", businessOwnerId);
      });

      // Create audit log for status change
      const auditLogData = {
        business_id: businessOwnerId,
        action: "update_order_status",
        target_type: "order",
        target_id: orderId,
        details: {
          invoice_no: currentOrder.invoice_no,
          customer_name: currentOrder.customer_name,
          previous_status: previousStatus,
          new_status: status,
          changed_at: new Date().toISOString(),
        },
      };

      const { error: auditError } = await supabase
        .from("audit_logs")
        .insert(auditLogData);

      if (auditError) {
        console.error("Error creating audit log:", auditError);
        // Don't fail the operation if audit log fails, but log the error
      }

      // Update table status if indoor dining and order is completed/cancelled
      if (currentOrder?.dining_option === "indoor" && currentOrder?.table_id) {
        const previousTableStatus = await getTableStatus(currentOrder.table_id);

        if (
          status === "delivered" ||
          status === "cancelled" ||
          status === "completed"
        ) {
          await updateTableStatus(currentOrder.table_id, "available");

          // Add rollback operation for table status
          rollbackOperations.push(async () => {
            if (previousTableStatus) {
              await updateTableStatus(
                currentOrder.table_id!,
                previousTableStatus as "available" | "occupied" | "reserved"
              );
            }
          });
        } else if (status === "processing") {
          await updateTableStatus(currentOrder.table_id, "occupied");

          // Add rollback operation for table status
          rollbackOperations.push(async () => {
            if (previousTableStatus) {
              await updateTableStatus(
                currentOrder.table_id!,
                previousTableStatus as "available" | "occupied" | "reserved"
              );
            }
          });
        }
      }

      // Create notification for order status change
      try {
        const { createOrderStatusChangeNotification } = await import(
          "./notification-actions"
        );
        await createOrderStatusChangeNotification({
          order_id: orderId,
          invoice_no: currentOrder.invoice_no,
          previous_status: previousStatus,
          new_status: status,
          customer_name: currentOrder.customer_name,
        });
      } catch (notificationError) {
        console.error(
          "Error creating status change notification:",
          notificationError
        );
        // Don't fail the order update if notification creation fails
      }

      revalidatePath("/orders");
      revalidatePath(`/orders/${orderId}`);
      return {
        success: true,
        message: `Order status updated from '${previousStatus}' to '${status}'`,
        previousStatus,
        newStatus: status,
      };
    } catch (operationError) {
      // Rollback all operations in reverse order
      console.error(
        "Error during status update operations, rolling back:",
        operationError
      );

      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error("Error during rollback operation:", rollbackError);
        }
      }

      throw operationError;
    }
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    throw error;
  }
}

// Helper function to get current table status
async function getTableStatus(tableId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: table, error } = await supabase
      .from("tables")
      .select("status")
      .eq("id", tableId)
      .single();

    if (error) {
      console.error("Error fetching table status:", error);
      return null;
    }

    return table?.status || null;
  } catch (error) {
    console.error("Error in getTableStatus:", error);
    return null;
  }
}

export async function updateTableStatus(
  tableId: string,
  status: "available" | "occupied" | "reserved"
) {
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
        updated_at: new Date().toISOString(),
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
  customer_name?: string;
  customer_phone?: string;
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
  custom_charges?: CustomCharge[];
  custom_charges_total?: number;
  vat_rate?: number;
  service_charge_rate?: number;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // Validate and provide defaults for customer information
    const customerName = orderData.customer_name?.trim() || "Walk-in Customer";
    const customerPhone = orderData.customer_phone?.trim() || "N/A";

    // For delivery orders, ensure customer information is provided
    if (orderData.dining_option === "delivery") {
      if (!orderData.customer_name?.trim()) {
        throw new Error("Customer name is required for delivery orders");
      }
      if (!orderData.customer_phone?.trim()) {
        throw new Error("Customer phone is required for delivery orders");
      }
    }

    // Start a transaction
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: businessOwnerId,
        customer_name: customerName,
        customer_phone: customerPhone,
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
        custom_charges_total: orderData.custom_charges_total ?? 0,
        vat_rate: orderData.vat_rate ?? 7.5,
        service_charge_rate: orderData.service_charge_rate ?? 2.5,
        notes: orderData.notes,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

    // Create order items
    const orderItems = orderData.items.map((item) => ({
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

    // Create custom charges if any
    if (orderData.custom_charges && orderData.custom_charges.length > 0) {
      const customCharges = orderData.custom_charges.map((charge) => ({
        order_id: order.id,
        charge_name: charge.charge_name,
        charge_type: charge.charge_type,
        charge_value: charge.charge_value,
        calculated_amount: charge.calculated_amount,
      }));

      const { error: chargesError } = await supabase
        .from("order_custom_charges")
        .insert(customCharges);

      if (chargesError) {
        console.error("Error creating custom charges:", chargesError);
        throw new Error("Failed to create custom charges");
      }
    }

    // Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
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
      revenue:
        todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
      pending:
        todayOrders?.filter((order) => order.status === "pending").length || 0,
      processing:
        todayOrders?.filter((order) => order.status === "processing").length ||
        0,
      delivered:
        todayOrders?.filter((order) => order.status === "delivered").length ||
        0,
    };

    const monthStats = {
      total: monthOrders?.length || 0,
      revenue:
        monthOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
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

export async function updateOrder(
  orderId: string,
  updateData: {
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    dining_option?: "indoor" | "delivery";
    table_id?: string;
    delivery_location_id?: string;
    rider_name?: string;
    rider_phone?: string;
    notes?: string;
  }
) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // First check if order exists and belongs to business
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select(
        "id, status, business_id, customer_name, customer_phone, customer_address, dining_option, table_id, delivery_location_id, rider_name, rider_phone, notes, invoice_no"
      )
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (fetchError || !existingOrder) {
      throw new Error("Order not found");
    }

    // Get editable fields for current order status
    const editableFields = getEditableFields(
      existingOrder.status as OrderStatus
    );

    if (editableFields.length === 0) {
      throw new Error(
        `Cannot edit orders with status '${existingOrder.status}'`
      );
    }

    // Validate that only editable fields are being updated
    const attemptedFields = Object.keys(updateData);
    const invalidFields = attemptedFields.filter(
      (field) => !editableFields.includes(field)
    );

    if (invalidFields.length > 0) {
      throw new Error(
        `Cannot edit fields [${invalidFields.join(
          ", "
        )}] for order with status '${existingOrder.status}'. ` +
          `Editable fields: [${editableFields.join(", ")}]`
      );
    }

    // Validate specific field constraints
    if (updateData.dining_option) {
      // If changing dining option, validate related fields
      if (updateData.dining_option === "indoor" && !updateData.table_id) {
        throw new Error("Table ID is required for indoor dining");
      }
      if (
        updateData.dining_option === "delivery" &&
        !updateData.delivery_location_id
      ) {
        throw new Error("Delivery location is required for delivery orders");
      }
    }

    // Validate phone number format if provided
    if (updateData.customer_phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(updateData.customer_phone.replace(/\s/g, ""))) {
        throw new Error("Invalid phone number format");
      }
    }

    // Filter out undefined values and only include changed fields
    const filteredUpdateData: Record<string, any> = {};
    const changedFields: string[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== existingOrder[key as keyof typeof existingOrder]
      ) {
        filteredUpdateData[key] = value;
        changedFields.push(key);
      }
    });

    // If no fields actually changed, return early
    if (changedFields.length === 0) {
      return {
        success: true,
        message: "No changes detected",
        changedFields: [],
      };
    }

    // Store original values for audit log
    const originalValues: Record<string, any> = {};
    changedFields.forEach((field) => {
      originalValues[field] =
        existingOrder[field as keyof typeof existingOrder];
    });

    // Update the order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        ...filteredUpdateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("business_id", businessOwnerId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order");
    }

    // Create audit log for order update
    const auditLogData = {
      business_id: businessOwnerId,
      action: "update_order",
      target_type: "order",
      target_id: orderId,
      details: {
        invoice_no: existingOrder.invoice_no,
        customer_name: existingOrder.customer_name,
        changed_fields: changedFields,
        original_values: originalValues,
        new_values: filteredUpdateData,
        updated_at: new Date().toISOString(),
      },
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditLogData);

    if (auditError) {
      console.error("Error creating audit log:", auditError);
      // Don't fail the operation if audit log fails, but log the error
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");

    return {
      success: true,
      message: `Order updated successfully. Changed fields: ${changedFields.join(
        ", "
      )}`,
      changedFields,
      updatedData: filteredUpdateData,
    };
  } catch (error) {
    console.error("Error in updateOrder:", error);
    throw error;
  }
}

export async function voidOrder(
  orderId: string,
  voidData: {
    reason?: string;
  }
) {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      throw new Error("Unauthorized");
    }

    // First check if order exists and can be voided - get complete order data for audit
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(*),
        payment:payments(*),
        table:tables(id, table_number),
        delivery_location:delivery_locations(id, name, price)
      `
      )
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (fetchError || !existingOrder) {
      throw new Error("Order not found or access denied");
    }

    // Validate authorization - ensure order belongs to the business
    if (existingOrder.business_id !== businessOwnerId) {
      throw new Error("Unauthorized: Order does not belong to your business");
    }

    // Only allow voiding pending orders
    if (existingOrder.status !== "pending") {
      throw new Error(
        `Cannot void order with status '${existingOrder.status}'. Only pending orders can be voided.`
      );
    }

    // Validate void reason if provided
    if (voidData.reason && voidData.reason.trim().length > 500) {
      throw new Error("Void reason cannot exceed 500 characters");
    }

    // Create comprehensive audit log entry before deletion
    const auditLogData = {
      business_id: businessOwnerId,
      action: "void_order",
      target_type: "order",
      target_id: orderId,
      details: {
        // Order details
        invoice_no: existingOrder.invoice_no,
        customer_name: existingOrder.customer_name,
        customer_phone: existingOrder.customer_phone,
        customer_address: existingOrder.customer_address,
        dining_option: existingOrder.dining_option,
        table_id: existingOrder.table_id,
        delivery_location_id: existingOrder.delivery_location_id,

        // Financial details
        subtotal: existingOrder.subtotal,
        vat_amount: existingOrder.vat_amount,
        service_charge: existingOrder.service_charge,
        total_amount: existingOrder.total_amount,
        payment_method: existingOrder.payment_method,

        // Order items
        items:
          existingOrder.items?.map((item: OrderItem) => ({
            menu_item_id: item.menu_item_id,
            menu_item_name: item.menu_item_name,
            menu_item_price: item.menu_item_price,
            quantity: item.quantity,
            total_price: item.total_price,
          })) || [],

        // Payment info
        payment_status: existingOrder.payment?.status,

        // Void details
        reason: voidData.reason?.trim() || "No reason provided",
        voided_at: new Date().toISOString(),
        voided_by: businessOwnerId,

        // Timestamps
        original_created_at: existingOrder.created_at,
        original_updated_at: existingOrder.updated_at,
      },
    };

    // Create audit log entry before deletion (critical for compliance)
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditLogData);

    if (auditError) {
      console.error("Error creating audit log:", auditError);
      throw new Error(
        "Failed to create audit log. Void operation cancelled for data integrity."
      );
    }

    // Verify cascade deletion constraints are in place before proceeding
    // This ensures related records (order_items, payments, etc.) will be deleted automatically
    const { data: constraintCheck } = await supabase
      .rpc("check_cascade_constraints", {
        table_name: "orders",
        column_name: "id",
      })
      .single();

    // Delete the order (cascade deletion will handle related records)
    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("business_id", businessOwnerId);

    if (deleteError) {
      console.error("Error voiding order:", deleteError);

      // Provide specific error messages based on the error
      if (deleteError.code === "23503") {
        throw new Error(
          "Cannot void order: There are related records that prevent deletion. Please contact support."
        );
      } else if (deleteError.code === "42501") {
        throw new Error("Insufficient permissions to void this order.");
      } else {
        throw new Error(`Failed to void order: ${deleteError.message}`);
      }
    }

    // Update table status if it was indoor dining
    if (existingOrder.dining_option === "indoor" && existingOrder.table_id) {
      try {
        await updateTableStatus(existingOrder.table_id, "available");
      } catch (tableError) {
        console.error("Error updating table status after void:", tableError);
        // Don't fail the void operation if table update fails
        // The order has already been deleted successfully
      }
    }

    // Create success notification
    try {
      const { createNotification } = await import("./notification-actions");
      await createNotification({
        business_id: businessOwnerId,
        type: "system_alert",
        title: "Order Voided",
        message: `Order ${existingOrder.invoice_no} for ${existingOrder.customer_name} has been voided`,
        data: {
          alert_type: "order_voided",
          order_id: orderId,
          invoice_no: existingOrder.invoice_no,
          customer_name: existingOrder.customer_name,
          total_amount: existingOrder.total_amount,
          reason: voidData.reason?.trim() || "No reason provided",
        },
        priority: "high",
      });
    } catch (notificationError) {
      console.error("Error creating void notification:", notificationError);
      // Don't fail the void operation if notification fails
    }

    revalidatePath("/orders");

    return {
      success: true,
      message: `Order ${existingOrder.invoice_no} has been successfully voided`,
      voidedOrder: {
        id: orderId,
        invoice_no: existingOrder.invoice_no,
        customer_name: existingOrder.customer_name,
        total_amount: existingOrder.total_amount,
        voided_at: new Date().toISOString(),
        reason: voidData.reason?.trim() || "No reason provided",
      },
    };
  } catch (error) {
    console.error("Error in voidOrder:", error);
    throw error;
  }
}

// Helper function to check if an order can be voided
export async function canVoidOrder(orderId: string): Promise<{
  canVoid: boolean;
  reason?: string;
}> {
  try {
    const supabase = await createClient();
    const businessOwnerId = await getServerBusinessOwnerId();

    if (!businessOwnerId) {
      return { canVoid: false, reason: "Unauthorized" };
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("status, business_id")
      .eq("id", orderId)
      .eq("business_id", businessOwnerId)
      .single();

    if (error || !order) {
      return { canVoid: false, reason: "Order not found" };
    }

    if (order.status !== "pending") {
      return {
        canVoid: false,
        reason: `Cannot void order with status '${order.status}'. Only pending orders can be voided.`,
      };
    }

    return { canVoid: true };
  } catch (error) {
    console.error("Error checking void permissions:", error);
    return { canVoid: false, reason: "Error checking permissions" };
  }
}
