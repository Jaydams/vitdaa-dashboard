export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
};

export type CreateCustomerData = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

export type UpdateCustomerData = Partial<CreateCustomerData>;
