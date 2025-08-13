-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  invoice_no VARCHAR(50) UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT,
  dining_option VARCHAR(20) NOT NULL CHECK (dining_option IN ('indoor', 'delivery')),
  table_id UUID REFERENCES tables(id),
  takeaway_packs INTEGER DEFAULT 0,
  takeaway_pack_price DECIMAL(10,2) DEFAULT 0,
  delivery_location_id UUID REFERENCES delivery_locations(id),
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  rider_name VARCHAR(255),
  rider_phone VARCHAR(20),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'wallet', 'transfer')),
  subtotal DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  service_charge DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')),
  notes TEXT,
  order_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  menu_item_name VARCHAR(255) NOT NULL,
  menu_item_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);

-- Enable Row Level Security (RLS)
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

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the next number for this business
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM orders
  WHERE business_id = NEW.business_id;
  
  -- Format: INV-YYYYMMDD-XXXX (e.g., INV-20250115-0001)
  NEW.invoice_no := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set invoice number
CREATE OR REPLACE FUNCTION set_invoice_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL THEN
    NEW.invoice_no := generate_invoice_no();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_no_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_no(); 