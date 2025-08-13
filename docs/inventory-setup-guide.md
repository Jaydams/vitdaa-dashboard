# Inventory Management System - Setup Guide

## Quick Start

### Step 1: Run the SQL Script
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `inventory_management.sql`
4. Execute the script

### Step 2: Create Sample Data (Optional)
After running the main script, you can add sample data to test the system:

```sql
-- Replace 'your-business-id' with your actual business ID
-- You can find this in your business_owner table

-- Add sample categories
INSERT INTO public.inventory_categories (business_id, name, description, category_type) VALUES
  ('your-business-id', 'Fresh Produce', 'Fresh fruits and vegetables', 'food'),
  ('your-business-id', 'Meat & Poultry', 'Fresh meat and poultry products', 'food'),
  ('your-business-id', 'Dairy Products', 'Milk, cheese, and dairy items', 'food'),
  ('your-business-id', 'Beverages', 'Soft drinks and juices', 'beverage'),
  ('your-business-id', 'Alcoholic Beverages', 'Beer, wine, and spirits', 'beverage'),
  ('your-business-id', 'Cleaning Supplies', 'Cleaning and sanitizing products', 'cleaning'),
  ('your-business-id', 'Kitchen Equipment', 'Kitchen tools and equipment', 'equipment');

-- Add sample suppliers
INSERT INTO public.suppliers (business_id, name, contact_person, email, phone, address) VALUES
  ('your-business-id', 'Fresh Foods Ltd', 'John Smith', 'john@freshfoods.com', '+2348012345678', '123 Market Street, Lagos'),
  ('your-business-id', 'Quality Meats', 'Sarah Johnson', 'sarah@qualitymeats.com', '+2348098765432', '456 Butcher Road, Lagos'),
  ('your-business-id', 'Beverage Supply Co', 'Mike Wilson', 'mike@beveragesupply.com', '+2348076543210', '789 Drink Avenue, Lagos');

-- Add sample inventory items
INSERT INTO public.inventory_items (
  business_id, category_id, supplier_id, name, description, sku, 
  unit_of_measure, current_stock, minimum_stock, reorder_point, 
  reorder_quantity, unit_cost, is_perishable, expiry_date
) VALUES
  ('your-business-id', 
   (SELECT id FROM public.inventory_categories WHERE name = 'Fresh Produce' AND business_id = 'your-business-id'),
   (SELECT id FROM public.suppliers WHERE name = 'Fresh Foods Ltd' AND business_id = 'your-business-id'),
   'Fresh Tomatoes', 'Fresh red tomatoes for salads and cooking', 'TOM-001',
   'kg', 25, 10, 15, 50, 500, true, '2024-02-15'),
   
  ('your-business-id',
   (SELECT id FROM public.inventory_categories WHERE name = 'Meat & Poultry' AND business_id = 'your-business-id'),
   (SELECT id FROM public.suppliers WHERE name = 'Quality Meats' AND business_id = 'your-business-id'),
   'Chicken Breast', 'Fresh chicken breast fillets', 'CHK-001',
   'kg', 15, 5, 8, 20, 1200, true, '2024-02-10'),
   
  ('your-business-id',
   (SELECT id FROM public.inventory_categories WHERE name = 'Beverages' AND business_id = 'your-business-id'),
   (SELECT id FROM public.suppliers WHERE name = 'Beverage Supply Co' AND business_id = 'your-business-id'),
   'Coca Cola', 'Coca Cola soft drinks 330ml', 'COLA-001',
   'bottles', 100, 20, 30, 50, 150, false, NULL);
```

## Integration with Existing System

### 1. Link Menu Items to Ingredients
Connect your existing menu items to inventory ingredients:

```sql
-- Example: Link a menu item to its required ingredients
INSERT INTO public.menu_item_ingredients (
  menu_item_id, inventory_item_id, quantity_required, unit_of_measure
) VALUES
  (1, -- Replace with your menu item ID
   (SELECT id FROM public.inventory_items WHERE sku = 'TOM-001'),
   0.2, -- 200g of tomatoes per serving
   'kg');
```

### 2. Update Staff Permissions
The inventory system integrates with your existing staff permission system. Kitchen and bar staff already have inventory permissions:

- **Kitchen Staff**: `inventory:read`, `inventory:update`, `inventory:alerts`
- **Bar Staff**: `inventory:read`, `inventory:update`, `inventory:restock_requests`

### 3. Test the System

#### Check Low Stock Items:
```sql
SELECT * FROM public.low_stock_items;
```

#### Check Expiring Items:
```sql
SELECT * FROM public.expiring_items;
```

#### Check Inventory Valuation:
```sql
SELECT * FROM public.inventory_valuation;
```

## Key Features to Test

### 1. **Stock Updates**
Record a purchase transaction:
```sql
INSERT INTO public.inventory_transactions (
  business_id, item_id, transaction_type, quantity, 
  unit_cost, total_cost, previous_stock, new_stock, 
  supplier_id, staff_id, notes
) VALUES (
  'your-business-id',
  (SELECT id FROM public.inventory_items WHERE sku = 'TOM-001'),
  'purchase', 10, 500, 5000, 25, 35,
  (SELECT id FROM public.suppliers WHERE name = 'Fresh Foods Ltd'),
  'your-staff-id',
  'Weekly tomato purchase'
);
```

### 2. **Automatic Alerts**
The system will automatically create alerts when:
- Stock falls below minimum levels
- Items approach expiration
- Items are out of stock

Check alerts:
```sql
SELECT * FROM public.inventory_alerts WHERE is_resolved = false;
```

### 3. **Purchase Orders**
Create a purchase order:
```sql
INSERT INTO public.purchase_orders (
  business_id, supplier_id, po_number, status, created_by
) VALUES (
  'your-business-id',
  (SELECT id FROM public.suppliers WHERE name = 'Fresh Foods Ltd'),
  'PO-2024-001', 'draft', 'your-staff-id'
);
```

## Dashboard Integration

The inventory system is designed to integrate with your existing dashboard. The following routes are already configured in your navigation:

- `/staff/kitchen/inventory` - Kitchen inventory management
- `/staff/bar/inventory` - Bar inventory management

## Monitoring and Maintenance

### Daily Tasks
1. Check low stock alerts
2. Review expiring items
3. Record daily transactions
4. Update stock levels

### Weekly Tasks
1. Review inventory reports
2. Plan purchase orders
3. Conduct partial counts
4. Analyze usage patterns

### Monthly Tasks
1. Conduct full inventory count
2. Review supplier performance
3. Update minimum stock levels
4. Generate valuation reports

## Troubleshooting

### Common Issues

1. **"Table doesn't exist" errors**
   - Ensure you ran the complete SQL script
   - Check that all tables were created successfully

2. **Permission errors**
   - Verify staff has correct inventory permissions
   - Check role-based access settings

3. **Stock discrepancies**
   - Review recent transactions
   - Conduct physical count
   - Check for unrecorded movements

### Getting Help

1. Check the main documentation: `docs/inventory-management-system.md`
2. Review the database views for common queries
3. Use the automated triggers for consistency
4. Monitor the audit trail for debugging

## Next Steps

After setting up the basic system:

1. **Customize Categories**: Create categories specific to your business
2. **Add Suppliers**: Enter your actual suppliers
3. **Set Stock Levels**: Configure minimum stock and reorder points
4. **Link Menu Items**: Connect your menu items to inventory ingredients
5. **Train Staff**: Ensure staff understand the system
6. **Monitor Performance**: Use the reporting features to optimize operations

The inventory management system is now ready to help you track and manage your inventory efficiently!
