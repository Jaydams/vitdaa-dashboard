import { OrderMethod, OrderStatus } from "@/types/order";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "delivered",
  "cancelled",
];

export const ORDER_METHODS: OrderMethod[] = ["cash", "wallet", "card"];
