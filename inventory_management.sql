-- Inventory Management System for Restaurants and Hotels
-- This file contains all the necessary tables for comprehensive inventory management

-- =============================================================================
-- INVENTORY CATEGORIES
-- =============================================================================

CREATE TABLE public.inventory_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  parent_category_id uuid,
  category_type text NOT NULL CHECK (category_type = ANY (ARRAY['food'::text, 'beverage'::text, 'supplies'::text, 'equipment'::text, 'cleaning'::text, 'other'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.inventory_categories(id) ON DELETE SET NULL
);

-- =============================================================================
-- SUPPLIERS
-- =============================================================================

CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  tax_id text,
  payment_terms text,
  credit_limit numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- =============================================================================
-- INVENTORY ITEMS
-- =============================================================================

CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  category_id uuid,
  supplier_id uuid,
  name text NOT NULL,
  description text,
  sku text UNIQUE,
  barcode text,
  unit_of_measure text NOT NULL CHECK (unit_of_measure = ANY (ARRAY['pieces'::text, 'kg'::text, 'grams'::text, 'liters'::text, 'ml'::text, 'boxes'::text, 'bottles'::text, 'cans'::text, 'bags'::text, 'packs'::text, 'units'::text])),
  current_stock numeric DEFAULT 0,
  minimum_stock numeric DEFAULT 0,
  maximum_stock numeric DEFAULT 0,
  reorder_point numeric DEFAULT 0,
  reorder_quantity numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  expiry_date date,
  location text,
  is_perishable boolean DEFAULT false,
  is_alcoholic boolean DEFAULT false,
  is_ingredient boolean DEFAULT false,
  is_available boolean DEFAULT true,
  image_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  CONSTRAINT inventory_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL
);

-- =============================================================================
-- INVENTORY TRANSACTIONS
-- =============================================================================

CREATE TABLE public.inventory_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  item_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'adjustment'::text, 'waste'::text, 'transfer_in'::text, 'transfer_out'::text, 'return'::text, 'damage'::text, 'expiry'::text])),
  quantity numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  previous_stock numeric NOT NULL,
  new_stock numeric NOT NULL,
  reference_number text,
  supplier_id uuid,
  order_id uuid,
  staff_id uuid,
  notes text,
  transaction_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT inventory_transactions_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL,
  CONSTRAINT inventory_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL,
  CONSTRAINT inventory_transactions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- INVENTORY ALERTS
-- =============================================================================

CREATE TABLE public.inventory_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  item_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type = ANY (ARRAY['low_stock'::text, 'out_of_stock'::text, 'expiring_soon'::text, 'expired'::text, 'overstock'::text, 'price_change'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_alerts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_alerts_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT inventory_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- PURCHASE ORDERS
-- =============================================================================

CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  po_number text NOT NULL UNIQUE,
  order_date timestamp with time zone DEFAULT now(),
  expected_delivery_date timestamp with time zone,
  delivery_date timestamp with time zone,
  status text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'confirmed'::text, 'received'::text, 'cancelled'::text])),
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE,
  CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- PURCHASE ORDER ITEMS
-- =============================================================================

CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity_ordered numeric NOT NULL,
  quantity_received numeric DEFAULT 0,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE
);

-- =============================================================================
-- INVENTORY ADJUSTMENTS
-- =============================================================================

CREATE TABLE public.inventory_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type = ANY (ARRAY['count'::text, 'damage'::text, 'waste'::text, 'theft'::text, 'quality_control'::text, 'other'::text])),
  reason text NOT NULL,
  adjustment_date timestamp with time zone DEFAULT now(),
  total_value numeric DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_adjustments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- INVENTORY ADJUSTMENT ITEMS
-- =============================================================================

CREATE TABLE public.inventory_adjustment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adjustment_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity_adjusted numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_adjustment_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.inventory_adjustments(id) ON DELETE CASCADE,
  CONSTRAINT inventory_adjustment_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE
);

-- =============================================================================
-- INVENTORY COUNT SESSIONS
-- =============================================================================

CREATE TABLE public.inventory_count_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  session_name text NOT NULL,
  count_type text NOT NULL CHECK (count_type = ANY (ARRAY['full'::text, 'partial'::text, 'cycle'::text])),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_count_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_count_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_count_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- INVENTORY COUNT ITEMS
-- =============================================================================

CREATE TABLE public.inventory_count_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  count_session_id uuid NOT NULL,
  item_id uuid NOT NULL,
  expected_quantity numeric NOT NULL,
  actual_quantity numeric,
  variance numeric,
  variance_percentage numeric,
  notes text,
  counted_by uuid,
  counted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_count_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_count_items_count_session_id_fkey FOREIGN KEY (count_session_id) REFERENCES public.inventory_count_sessions(id) ON DELETE CASCADE,
  CONSTRAINT inventory_count_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT inventory_count_items_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- MENU ITEM INGREDIENTS (Linking menu items to inventory items)
-- =============================================================================

CREATE TABLE public.menu_item_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_item_id integer NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity_required numeric NOT NULL,
  unit_of_measure text NOT NULL,
  is_optional boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT menu_item_ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT menu_item_ingredients_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE,
  CONSTRAINT menu_item_ingredients_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT menu_item_ingredients_unique UNIQUE (menu_item_id, inventory_item_id)
);

-- =============================================================================
-- INVENTORY REPORTS
-- =============================================================================

CREATE TABLE public.inventory_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type = ANY (ARRAY['stock_level'::text, 'movement'::text, 'valuation'::text, 'usage'::text, 'expiry'::text, 'custom'::text])),
  report_name text NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}',
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_reports_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_reports_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT inventory_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.staff(id) ON DELETE SET NULL
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Inventory items indexes
CREATE INDEX idx_inventory_items_business_id ON public.inventory_items(business_id);
CREATE INDEX idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX idx_inventory_items_supplier_id ON public.inventory_items(supplier_id);
CREATE INDEX idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_items_current_stock ON public.inventory_items(current_stock);
CREATE INDEX idx_inventory_items_expiry_date ON public.inventory_items(expiry_date);

-- Inventory transactions indexes
CREATE INDEX idx_inventory_transactions_business_id ON public.inventory_transactions(business_id);
CREATE INDEX idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_transaction_type ON public.inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_transaction_date ON public.inventory_transactions(transaction_date);

-- Inventory alerts indexes
CREATE INDEX idx_inventory_alerts_business_id ON public.inventory_alerts(business_id);
CREATE INDEX idx_inventory_alerts_item_id ON public.inventory_alerts(item_id);
CREATE INDEX idx_inventory_alerts_alert_type ON public.inventory_alerts(alert_type);
CREATE INDEX idx_inventory_alerts_is_resolved ON public.inventory_alerts(is_resolved);

-- Purchase orders indexes
CREATE INDEX idx_purchase_orders_business_id ON public.purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_po_number ON public.purchase_orders(po_number);

-- Categories indexes
CREATE INDEX idx_inventory_categories_business_id ON public.inventory_categories(business_id);
CREATE INDEX idx_inventory_categories_parent_category_id ON public.inventory_categories(parent_category_id);

-- Suppliers indexes
CREATE INDEX idx_suppliers_business_id ON public.suppliers(business_id);

-- Menu item ingredients indexes
CREATE INDEX idx_menu_item_ingredients_menu_item_id ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX idx_menu_item_ingredients_inventory_item_id ON public.menu_item_ingredients(inventory_item_id);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update inventory item stock levels
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current stock based on transaction
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'purchase' OR NEW.transaction_type = 'transfer_in' OR NEW.transaction_type = 'return' THEN
      UPDATE public.inventory_items 
      SET current_stock = current_stock + NEW.quantity,
          updated_at = now()
      WHERE id = NEW.item_id;
    ELSIF NEW.transaction_type = 'sale' OR NEW.transaction_type = 'waste' OR NEW.transaction_type = 'transfer_out' OR NEW.transaction_type = 'damage' OR NEW.transaction_type = 'expiry' THEN
      UPDATE public.inventory_items 
      SET current_stock = current_stock - NEW.quantity,
          updated_at = now()
      WHERE id = NEW.item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update stock levels
CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_stock();

-- Function to create low stock alerts
CREATE OR REPLACE FUNCTION create_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is below minimum level
  IF NEW.current_stock <= NEW.minimum_stock AND NEW.current_stock > 0 THEN
    INSERT INTO public.inventory_alerts (
      business_id, item_id, alert_type, severity, message
    ) VALUES (
      NEW.business_id, 
      NEW.id, 
      'low_stock', 
      CASE 
        WHEN NEW.current_stock = 0 THEN 'critical'
        WHEN NEW.current_stock <= (NEW.minimum_stock * 0.5) THEN 'high'
        ELSE 'medium'
      END,
      'Item ' || NEW.name || ' is running low on stock. Current: ' || NEW.current_stock || ' ' || NEW.unit_of_measure || ', Minimum: ' || NEW.minimum_stock || ' ' || NEW.unit_of_measure
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create low stock alerts
CREATE TRIGGER trigger_create_low_stock_alert
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION create_low_stock_alert();

-- Function to create expiry alerts
CREATE OR REPLACE FUNCTION create_expiry_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if item is expiring soon (within 7 days)
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= (CURRENT_DATE + INTERVAL '7 days') THEN
    INSERT INTO public.inventory_alerts (
      business_id, item_id, alert_type, severity, message
    ) VALUES (
      NEW.business_id, 
      NEW.id, 
      'expiring_soon', 
      CASE 
        WHEN NEW.expiry_date <= CURRENT_DATE THEN 'critical'
        WHEN NEW.expiry_date <= (CURRENT_DATE + INTERVAL '3 days') THEN 'high'
        ELSE 'medium'
      END,
      'Item ' || NEW.name || ' is expiring on ' || NEW.expiry_date || '. Please use or dispose of this item.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create expiry alerts
CREATE TRIGGER trigger_create_expiry_alert
  AFTER INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION create_expiry_alert();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for low stock items
CREATE VIEW public.low_stock_items AS
SELECT 
  ii.id,
  ii.name,
  ii.current_stock,
  ii.minimum_stock,
  ii.reorder_point,
  ii.reorder_quantity,
  ii.unit_of_measure,
  ic.name as category_name,
  s.name as supplier_name,
  s.phone as supplier_phone,
  s.email as supplier_email
FROM public.inventory_items ii
LEFT JOIN public.inventory_categories ic ON ii.category_id = ic.id
LEFT JOIN public.suppliers s ON ii.supplier_id = s.id
WHERE ii.current_stock <= ii.minimum_stock
  AND ii.is_available = true;

-- View for expiring items
CREATE VIEW public.expiring_items AS
SELECT 
  ii.id,
  ii.name,
  ii.expiry_date,
  ii.current_stock,
  ii.unit_of_measure,
  ic.name as category_name,
  CASE 
    WHEN ii.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN ii.expiry_date <= (CURRENT_DATE + INTERVAL '3 days') THEN 'expiring_soon'
    ELSE 'expiring_later'
  END as expiry_status
FROM public.inventory_items ii
LEFT JOIN public.inventory_categories ic ON ii.category_id = ic.id
WHERE ii.expiry_date IS NOT NULL
  AND ii.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
  AND ii.current_stock > 0
  AND ii.is_available = true
ORDER BY ii.expiry_date ASC;

-- View for inventory valuation
CREATE VIEW public.inventory_valuation AS
SELECT 
  ii.id,
  ii.name,
  ii.current_stock,
  ii.unit_cost,
  (ii.current_stock * ii.unit_cost) as total_value,
  ic.name as category_name,
  ic.category_type
FROM public.inventory_items ii
LEFT JOIN public.inventory_categories ic ON ii.category_id = ic.id
WHERE ii.current_stock > 0
  AND ii.is_available = true;

-- View for recent transactions
CREATE VIEW public.recent_inventory_transactions AS
SELECT 
  it.id,
  it.transaction_type,
  it.quantity,
  it.total_cost,
  it.transaction_date,
  ii.name as item_name,
  ii.unit_of_measure,
  s.name as supplier_name,
  st.first_name || ' ' || st.last_name as staff_name
FROM public.inventory_transactions it
JOIN public.inventory_items ii ON it.item_id = ii.id
LEFT JOIN public.suppliers s ON it.supplier_id = s.id
LEFT JOIN public.staff st ON it.staff_id = st.id
ORDER BY it.transaction_date DESC;

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

-- Insert sample categories
-- INSERT INTO public.inventory_categories (business_id, name, description, category_type) VALUES
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Fresh Produce', 'Fresh fruits and vegetables', 'food'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Meat & Poultry', 'Fresh meat and poultry products', 'food'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Dairy Products', 'Milk, cheese, and dairy items', 'food'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Beverages', 'Soft drinks and juices', 'beverage'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Alcoholic Beverages', 'Beer, wine, and spirits', 'beverage'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Cleaning Supplies', 'Cleaning and sanitizing products', 'cleaning'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Kitchen Equipment', 'Kitchen tools and equipment', 'equipment');

-- Insert sample suppliers
-- INSERT INTO public.suppliers (business_id, name, contact_person, email, phone, address) VALUES
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Fresh Foods Ltd', 'John Smith', 'john@freshfoods.com', '+2348012345678', '123 Market Street, Lagos'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Quality Meats', 'Sarah Johnson', 'sarah@qualitymeats.com', '+2348098765432', '456 Butcher Road, Lagos'),
--   ('73bf3020-60dc-4323-bd09-04313b59a53f', 'Beverage Supply Co', 'Mike Wilson', 'mike@beveragesupply.com', '+2348076543210', '789 Drink Avenue, Lagos');

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.inventory_categories IS 'Categories for organizing inventory items (food, beverage, supplies, etc.)';
COMMENT ON TABLE public.suppliers IS 'Suppliers and vendors for inventory items';
COMMENT ON TABLE public.inventory_items IS 'Main inventory items with stock levels and pricing';
COMMENT ON TABLE public.inventory_transactions IS 'All inventory movements (purchases, sales, adjustments, etc.)';
COMMENT ON TABLE public.inventory_alerts IS 'System-generated alerts for low stock, expiry, etc.';
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE public.purchase_order_items IS 'Individual items in purchase orders';
COMMENT ON TABLE public.inventory_adjustments IS 'Bulk inventory adjustments (counts, damage, etc.)';
COMMENT ON TABLE public.inventory_adjustment_items IS 'Individual items in inventory adjustments';
COMMENT ON TABLE public.inventory_count_sessions IS 'Physical inventory count sessions';
COMMENT ON TABLE public.inventory_count_items IS 'Individual items counted in inventory sessions';
COMMENT ON TABLE public.menu_item_ingredients IS 'Links menu items to required inventory ingredients';
COMMENT ON TABLE public.inventory_reports IS 'Generated inventory reports and analytics';

COMMENT ON COLUMN public.inventory_items.current_stock IS 'Current available quantity in stock';
COMMENT ON COLUMN public.inventory_items.minimum_stock IS 'Minimum stock level before reorder alert';
COMMENT ON COLUMN public.inventory_items.reorder_point IS 'Stock level at which to reorder';
COMMENT ON COLUMN public.inventory_items.reorder_quantity IS 'Recommended quantity to reorder';
COMMENT ON COLUMN public.inventory_items.unit_cost IS 'Cost per unit for inventory valuation';
COMMENT ON COLUMN public.inventory_items.selling_price IS 'Price when sold as standalone item';
COMMENT ON COLUMN public.inventory_items.cost_per_unit IS 'Calculated cost per unit for recipes';
COMMENT ON COLUMN public.inventory_items.is_perishable IS 'Whether item has expiry date';
COMMENT ON COLUMN public.inventory_items.is_alcoholic IS 'Whether item contains alcohol';
COMMENT ON COLUMN public.inventory_items.is_ingredient IS 'Whether item is used in menu recipes';
