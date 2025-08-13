import { fetchOrders as fetchOrdersAction, fetchOrder as fetchOrderAction } from "@/actions/order-actions";
import { Order } from "@/types/order";
import { PaginationData, PaginationQueryProps } from "@/types/pagination";

export const fetchOrders = async ({
  page,
  perPage = 10,
  status,
  search,
}: PaginationQueryProps & {
  status?: string;
  search?: string;
}) => {
  const result = await fetchOrdersAction({
    page,
    perPage,
    status: status as any,
    search,
  });
  
  return result as PaginationData<Order>;
};

export const fetchOrder = async ({ id }: { id: string }) => {
  const result = await fetchOrderAction(id);
  return result as Order;
};
