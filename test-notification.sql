-- Test script to verify notification system is working
-- Run this to create a test order and see if notifications appear

-- First, let's check if real-time is enabled for orders table
SELECT schemaname, tablename, replica_identity 
FROM pg_tables 
WHERE tablename = 'orders';

-- Enable real-time for orders table (if not already enabled)
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Check current orders to see business_id format
SELECT id, business_id, customer_name, status, created_at 
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Insert a test order (replace 'your-business-id' with actual business ID)
-- You can get your business ID from the business_owners table:
SELECT id, business_name FROM public.business_owners LIMIT 5;

-- Example test order insert (update business_id with actual value):
/*
INSERT INTO public.orders (
  business_id,
  customer_name,
  customer_phone,
  customer_address,
  total_amount,
  payment_method,
  dining_option,
  status,
  invoice_no,
  subtotal,
  vat_amount,
  service_charge,
  service_charge_amount,
  takeaway_packs,
  takeaway_pack_price,
  delivery_fee,
  wallet_payment_status
) VALUES (
  'your-business-id-here', -- Replace with actual business ID
  'Test Customer',
  '+1234567890',
  '123 Test Street',
  2500.00,
  'transfer',
  'indoor',
  'pending',
  'TEST-' || extract(epoch from now()),
  2200.00,
  165.00,
  135.00,
  135.00,
  0,
  0.00,
  0.00,
  'pending'
);
*/

-- Check if the order was created
SELECT * FROM public.orders WHERE customer_name = 'Test Customer' ORDER BY created_at DESC LIMIT 1;