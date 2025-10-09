import { OrderStatus } from "@/types/order";

// Define editable fields based on order status
const EDITABLE_FIELDS_BY_STATUS: Record<OrderStatus, string[]> = {
  pending: [
    "customer_name",
    "customer_phone",
    "customer_address",
    "dining_option",
    "table_id",
    "delivery_location_id",
    "rider_name",
    "rider_phone",
    "notes",
  ],
  processing: [
    "customer_address",
    "delivery_location_id",
    "rider_name",
    "rider_phone",
    "notes",
  ],
  ready: [
    "customer_address",
    "delivery_location_id",
    "rider_name",
    "rider_phone",
    "notes",
  ],
  delivered: [], // No fields editable
  completed: [], // No fields editable
  cancelled: [], // No fields editable
};

// Helper function to get editable fields for an order status
export function getEditableFields(status: OrderStatus): string[] {
  return EDITABLE_FIELDS_BY_STATUS[status] || [];
}

// Helper function to check if a field is editable for given status
export function isFieldEditable(field: string, status: OrderStatus): boolean {
  return EDITABLE_FIELDS_BY_STATUS[status]?.includes(field) || false;
}
