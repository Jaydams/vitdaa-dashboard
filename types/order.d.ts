export type OrderStatus = "pending" | "processing" | "ready" | "delivered" | "cancelled";
export type OrderMethod = "cash" | "wallet" | "card";
export type DiningOption = "indoor" | "delivery";

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  total_price: number;
  created_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  amount: number;
  payment_method: OrderMethod;
  transaction_id?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payment_time: string;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number: string;
  address?: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  business_id: string;
  customer_id?: string;
  invoice_no: string;
  order_time: string;
  dining_option: DiningOption;
  table_id?: string;
  takeaway_packs: number;
  takeaway_pack_price: number;
  delivery_location_id?: string;
  delivery_fee: number;
  rider_name?: string;
  rider_phone?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  subtotal: number;
  vat_amount: number;
  service_charge: number;
  total_amount: number;
  payment_method: OrderMethod;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Related data
  customer?: Customer;
  items?: OrderItem[];
  payment?: Payment;
  table?: {
    id: string;
    table_number: string;
  };
  delivery_location?: {
    id: string;
    name: string;
    price: number;
  };
};
