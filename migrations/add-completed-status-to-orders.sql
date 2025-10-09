-- Migration: Add completed status to orders table
-- This migration updates the orders table status check constraint to include 'completed' status

-- Drop the existing status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new status check constraint that includes 'completed'
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text]));