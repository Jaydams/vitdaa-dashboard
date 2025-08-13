-- Sample data for testing orders functionality
-- Run this after creating the orders tables
-- This data uses the actual business owner ID and menu items from your CSV exports

-- Insert sample tables for The Blueplate Restaurant
INSERT INTO public.tables (restaurant_id, table_number, capacity, status) VALUES
('73bf3020-60dc-4323-bd09-04313b59a53f', '1', 4, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '2', 6, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '3', 2, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '4', 8, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '5', 4, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '6', 6, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '7', 4, 'available'),
('73bf3020-60dc-4323-bd09-04313b59a53f', '8', 2, 'available');

-- Insert sample delivery locations for The Blueplate Restaurant
INSERT INTO public.delivery_locations (business_id, name, price, state) VALUES
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Kaduna Central', 500, 'Kaduna State'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Barnawa', 800, 'Kaduna State'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Ungwan Rimi', 600, 'Kaduna State'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Nasarawa', 400, 'Kaduna State'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Malali', 300, 'Kaduna State'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Ungwan Dosa', 700, 'Kaduna State');

-- Insert sample takeaway packs for The Blueplate Restaurant
INSERT INTO public.takeaway_packs (business_id, name, price) VALUES
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Standard Pack', 100),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Premium Pack', 200),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Family Pack', 300);

-- Insert sample customers for The Blueplate Restaurant
INSERT INTO public.customers (business_id, first_name, last_name, email, phone_number, address) VALUES
('73bf3020-60dc-4323-bd09-04313b59a53f', 'John', 'Doe', 'john.doe@email.com', '+2348012345678', '123 Main Street, Kaduna Central'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Jane', 'Smith', 'jane.smith@email.com', '+2348076543210', '456 Park Avenue, Barnawa'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Mike', 'Johnson', 'mike.johnson@email.com', '+2348098765432', '789 Oak Street, Ungwan Rimi'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'Sarah', 'Williams', 'sarah.williams@email.com', '+2348055555555', '321 Elm Street, Nasarawa'),
('73bf3020-60dc-4323-bd09-04313b59a53f', 'David', 'Brown', 'david.brown@email.com', '+2348066666666', '654 Pine Street, Malali');

-- Insert sample orders (these will have auto-generated invoice numbers)
INSERT INTO public.orders (
  business_id,
  customer_id,
  customer_name,
  customer_phone,
  customer_address,
  dining_option,
  table_id,
  takeaway_packs,
  takeaway_pack_price,
  delivery_location_id,
  delivery_fee,
  rider_name,
  rider_phone,
  subtotal,
  vat_amount,
  service_charge,
  total_amount,
  payment_method,
  status,
  notes
) VALUES
(
  '73bf3020-60dc-4323-bd09-04313b59a53f',
  (SELECT id FROM public.customers WHERE phone_number = '+2348012345678' LIMIT 1),
  'John Doe',
  '+2348012345678',
  '123 Main Street, Kaduna Central',
  'indoor',
  (SELECT id FROM public.tables WHERE table_number = '1' LIMIT 1),
  0,
  0,
  NULL,
  0,
  NULL,
  NULL,
  19832,
  1487,
  496,
  21815,
  'cash',
  'pending',
  'Extra spicy please'
),
(
  '73bf3020-60dc-4323-bd09-04313b59a53f',
  (SELECT id FROM public.customers WHERE phone_number = '+2348076543210' LIMIT 1),
  'Jane Smith',
  '+2348076543210',
  '456 Park Avenue, Barnawa',
  'delivery',
  NULL,
  2,
  100,
  (SELECT id FROM public.delivery_locations WHERE name = 'Barnawa' LIMIT 1),
  800,
  'Mike Johnson',
  '+2348098765432',
  27720,
  2079,
  693,
  30392,
  'wallet',
  'processing',
  'Handle with care'
),
(
  '73bf3020-60dc-4323-bd09-04313b59a53f',
  (SELECT id FROM public.customers WHERE phone_number = '+2348055555555' LIMIT 1),
  'Sarah Williams',
  '+2348055555555',
  '321 Elm Street, Nasarawa',
  'indoor',
  (SELECT id FROM public.tables WHERE table_number = '3' LIMIT 1),
  0,
  0,
  NULL,
  0,
  NULL,
  NULL,
  15800,
  1185,
  395,
  17380,
  'card',
  'delivered',
  'No onions please'
),
(
  '73bf3020-60dc-4323-bd09-04313b59a53f',
  (SELECT id FROM public.customers WHERE phone_number = '+2348066666666' LIMIT 1),
  'David Brown',
  '+2348066666666',
  '654 Pine Street, Malali',
  'delivery',
  NULL,
  1,
  100,
  (SELECT id FROM public.delivery_locations WHERE name = 'Malali' LIMIT 1),
  300,
  'Ahmed Hassan',
  '+2348077777777',
  11550,
  866,
  289,
  12705,
  'cash',
  'cancelled',
  'Order cancelled by customer'
);

-- Insert sample order items using actual menu items from your CSV
INSERT INTO public.order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, total_price) VALUES
-- Order 1: John Doe (Indoor - Pending)
(
  (SELECT id FROM public.orders WHERE customer_name = 'John Doe' LIMIT 1),
  160, -- JOLLOF RICE
  'JOLLOF RICE',
  4966,
  2,
  9932
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'John Doe' LIMIT 1),
  199, -- Crispy Fried Chicken with Chips
  'Crispy Fried Chicken with Chips',
  7900,
  1,
  7900
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'John Doe' LIMIT 1),
  50, -- CHICKEN SALAD
  'CHICKEN SALAD',
  8085,
  1,
  8085
),

-- Order 2: Jane Smith (Delivery - Processing)
(
  (SELECT id FROM public.orders WHERE customer_name = 'Jane Smith' LIMIT 1),
  81, -- BBQ CHICKEN PIZZA
  'BBQ CHICKEN PIZZA',
  13860,
  1,
  13860
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'Jane Smith' LIMIT 1),
  82, -- GRILLED CHICKEN PIZZA
  'GRILLED CHICKEN PIZZA',
  13860,
  1,
  13860
),

-- Order 3: Sarah Williams (Indoor - Delivered)
(
  (SELECT id FROM public.orders WHERE customer_name = 'Sarah Williams' LIMIT 1),
  55, -- PEPPERED CHICKEN
  'PEPPERED CHICKEN',
  9817,
  1,
  9817
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'Sarah Williams' LIMIT 1),
  183, -- FRIED RICE
  'FRIED RICE',
  4966,
  1,
  4966
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'Sarah Williams' LIMIT 1),
  37, -- SPICY CHICKEN WING
  'SPICY CHICKEN WING',
  5775,
  1,
  5775
),

-- Order 4: David Brown (Delivery - Cancelled)
(
  (SELECT id FROM public.orders WHERE customer_name = 'David Brown' LIMIT 1),
  61, -- SPICY SHRIMPS
  'SPICY SHRIMPS',
  11550,
  1,
  11550
);

-- Insert sample payments
INSERT INTO public.payments (order_id, amount, payment_method, status) VALUES
(
  (SELECT id FROM public.orders WHERE customer_name = 'John Doe' LIMIT 1),
  21815,
  'cash',
  'completed'
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'Jane Smith' LIMIT 1),
  30392,
  'wallet',
  'completed'
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'Sarah Williams' LIMIT 1),
  17380,
  'card',
  'completed'
),
(
  (SELECT id FROM public.orders WHERE customer_name = 'David Brown' LIMIT 1),
  12705,
  'cash',
  'refunded'
); 