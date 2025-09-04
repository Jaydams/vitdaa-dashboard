export interface Notification {
  id: string;
  business_id: string;
  user_id?: string;
  staff_id?: string;
  type: 'new_order' | 'order_status_change' | 'low_stock' | 'payment_received' | 'system_alert';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  is_archived: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NewOrderNotification extends Notification {
  type: 'new_order';
  data: {
    order_id: string;
    invoice_no: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
    payment_method: string;
    dining_option: string;
    table_id?: string;
    customer_address?: string;
  };
}

export interface OrderStatusChangeNotification extends Notification {
  type: 'order_status_change';
  data: {
    order_id: string;
    invoice_no: string;
    previous_status: string;
    new_status: string;
    customer_name: string;
  };
}

export interface LowStockNotification extends Notification {
  type: 'low_stock';
  data: {
    item_id: string;
    item_name: string;
    current_stock: number;
    minimum_stock: number;
  };
}

export interface PaymentReceivedNotification extends Notification {
  type: 'payment_received';
  data: {
    order_id: string;
    invoice_no: string;
    amount: number;
    payment_method: string;
    customer_name: string;
  };
}

export interface SystemAlertNotification extends Notification {
  type: 'system_alert';
  data: {
    alert_type: string;
    [key: string]: any;
  };
}

export type NotificationUnion = 
  | NewOrderNotification 
  | OrderStatusChangeNotification 
  | LowStockNotification 
  | PaymentReceivedNotification 
  | SystemAlertNotification;

// Legacy types for backward compatibility
export interface LegacyNewOrderNotification {
  id: string;
  type: "new-order";
  imageUrl: string;
  name: string;
  price: number;
  timestamp: string;
  isRead: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method?: string;
  dining_option?: string;
  table_number?: string;
}

export interface LegacyStockOutNotification {
  id: string;
  type: "stock-out";
  imageUrl: string;
  item: string;
  timestamp: string;
  isRead: string;
}

export type LegacyNotification = LegacyNewOrderNotification | LegacyStockOutNotification;
