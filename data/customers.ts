import { fetchCustomers as fetchCustomersAction, getCustomerStats as getCustomerStatsAction } from "@/actions/customer-actions";
import { Customer } from "@/types/customer";
import { PaginationData, PaginationQueryProps } from "@/types/pagination";

export const fetchCustomers = async ({
  page,
  perPage = 10,
}: PaginationQueryProps) => {
  const result = await fetchCustomersAction({ page, perPage });
  
  return {
    data: result.data,
    pages: result.pages,
    total: result.total,
    currentPage: result.currentPage,
    perPage: result.perPage,
  } as PaginationData<Customer>;
};

export const getCustomerStats = async () => {
  return await getCustomerStatsAction();
};
