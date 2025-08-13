import * as z from "zod";

// Address schema
const addressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

// Staff profile form schema
export const staffProfileFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: addressSchema.optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  employment_start_date: z.string().optional(),
  department: z.string().optional(),
  employee_id: z.string().optional(),
  notes: z.string().optional(),
  profile_image_url: z.string().optional(),
});

export type StaffProfileFormData = z.infer<typeof staffProfileFormSchema>;
