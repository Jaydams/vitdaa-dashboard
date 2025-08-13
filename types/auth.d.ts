import { User as SupabaseUser } from "@supabase/supabase-js";

// Business Owner types
export interface BusinessOwner {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  business_number: string | null;
  address: Record<string, any> | null;
  profile_image_url: string | null;
  business_type: string | null;
  username: string | null;
  description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  cover_image_url: string | null;
  phoneNumber: string | null;
  account_type: string;
  email_verified: boolean;
  phone_verified: boolean;
  bvn: string | null;
  bvn_verified: boolean;
  identity_type: string | null;
  identity_number: string | null;
  identity_image_url: string | null;
  identity_verified: boolean;
  maplerad_customer_id: string | null;
  admin_pin_hash: string | null;
  admin_pin_hash: string | null;
}

// Staff types (extending existing staff types)
export type StaffRole = "reception" | "kitchen" | "bar" | "accountant";
export type StaffStatus = "active" | "inactive";

export interface Staff {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  pin_hash: string;
  role: StaffRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// Staff Session types
export interface StaffSessionRecord {
  id: string;
  staff_id: string;
  business_id: string;
  session_token: string;
  signed_in_by: string;
  signed_in_at: string;
  signed_out_at?: string;
  is_active: boolean;
  expires_at: string;
}

// Session types
export interface BusinessOwnerSession {
  user: SupabaseUser;
  businessOwner: BusinessOwner;
  sessionType: "business_owner";
}

export interface StaffSession {
  staff: Staff;
  business: BusinessOwner;
  permissions: string[];
  sessionType: "staff";
  sessionRecord: StaffSessionRecord;
}

export type AppSession = BusinessOwnerSession | StaffSession;

// Authentication result types
export interface AuthResult {
  user: SupabaseUser;
  businessOwner: BusinessOwner | null;
  redirectUrl: string;
}

export interface StaffAuthResult {
  staff: Staff;
  business: BusinessOwner;
  redirectUrl: string;
}

// Form data types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  businessType?: string;
}

export interface StaffLoginFormData {
  pin: string;
  businessId?: string;
}

// Error types
export interface AuthError {
  message: string;
  code?: string;
  details?: unknown;
}
