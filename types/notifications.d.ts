export interface NewOrderNotification {
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

export interface StockOutNotification {
  id: string;
  type: "stock-out";
  imageUrl: string;
  item: string;
  timestamp: string;
  isRead: string;
}

export type Notification = NewOrderNotification | StockOutNotification;
