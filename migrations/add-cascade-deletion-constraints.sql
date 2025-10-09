-- Migration: Add cascade deletion constraints for order voiding
-- This migration modifies foreign key constraints for order_items, payments, and order_status_history tables
-- to ensure proper cascade deletion when orders are voided

-- Drop existing foreign key constraints
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_order_id_fkey;

ALTER TABLE public.order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;

-- Add new foreign key constraints with CASCADE DELETE
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.payments
ADD CONSTRAINT payments_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_status_history
ADD CONSTRAINT order_status_history_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Also update other related tables that might reference orders
-- Business wallet transactions
ALTER TABLE public.business_wallet_transactions
DROP CONSTRAINT IF EXISTS business_wallet_transactions_order_id_fkey;

ALTER TABLE public.business_wallet_transactions
ADD CONSTRAINT business_wallet_transactions_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- Inventory transactions
ALTER TABLE public.inventory_transactions
DROP CONSTRAINT IF EXISTS inventory_transactions_order_id_fkey;

ALTER TABLE public.inventory_transactions
ADD CONSTRAINT inventory_transactions_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- Order assignments
ALTER TABLE public.order_assignments
DROP CONSTRAINT IF EXISTS order_assignments_order_id_fkey;

ALTER TABLE public.order_assignments
ADD CONSTRAINT order_assignments_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;