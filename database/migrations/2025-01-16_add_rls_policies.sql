-- Add RLS Policies for Orders Tables
-- This migration adds Row Level Security policies to existing orders tables

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for orders table
CREATE POLICY "Business owners can view their own orders" ON orders
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Business owners can insert their own orders" ON orders
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Business owners can update their own orders" ON orders
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Business owners can delete their own orders" ON orders
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create policies for order_items table
CREATE POLICY "Business owners can view their order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Business owners can insert their order items" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Business owners can update their order items" ON order_items
  FOR UPDATE USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Business owners can delete their order items" ON order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Create policies for payments table
CREATE POLICY "Business owners can view their payments" ON payments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Business owners can insert their payments" ON payments
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Business owners can update their payments" ON payments
  FOR UPDATE USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Business owners can delete their payments" ON payments
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id IN (
        SELECT id FROM business_owner 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Create policies for customers table
CREATE POLICY "Business owners can view their customers" ON customers
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Business owners can insert their customers" ON customers
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Business owners can update their customers" ON customers
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Business owners can delete their customers" ON customers
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Note: Tables are already added to supabase_realtime publication
-- No need to add them again as they're already members 