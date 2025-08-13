# Inventory Management System

## Overview

The Inventory Management System provides comprehensive inventory tracking and management capabilities for restaurants and hotels. It integrates seamlessly with your existing menu and order management system to provide real-time stock tracking, automated alerts, and detailed reporting.

## Key Features

### 🏪 **Core Inventory Management**
- **Item Tracking**: Track stock levels, costs, and locations
- **Category Management**: Organize items by type (food, beverage, supplies, etc.)
- **Supplier Management**: Manage vendors and purchase orders
- **Multi-location Support**: Track items across different storage areas

### 📊 **Stock Control**
- **Real-time Stock Levels**: Automatic updates based on transactions
- **Minimum Stock Alerts**: Get notified when items run low
- **Reorder Points**: Set automatic reorder triggers
- **Expiry Tracking**: Monitor perishable items

### 🔔 **Automated Alerts**
- **Low Stock Alerts**: Automatic notifications for items below minimum levels
- **Expiry Alerts**: Warnings for items approaching expiration
- **Out of Stock Alerts**: Critical alerts for depleted items
- **Overstock Alerts**: Notifications for excessive inventory

### 📈 **Reporting & Analytics**
- **Stock Level Reports**: Current inventory status
- **Movement Reports**: Track item usage and trends
- **Valuation Reports**: Calculate inventory value
- **Usage Analytics**: Analyze consumption patterns

### 🛒 **Purchase Management**
- **Purchase Orders**: Create and track orders to suppliers
- **Receiving**: Record received items and update stock
- **Supplier Management**: Track vendor performance and terms

### 🔄 **Inventory Operations**
- **Physical Counts**: Conduct inventory audits
- **Adjustments**: Handle damage, waste, and corrections
- **Transfers**: Move items between locations
- **Returns**: Process supplier returns

## Database Schema

### Core Tables

#### 1. **inventory_categories**
Organizes inventory items into logical groups.

```sql
- id: Unique identifier
- business_id: Links to business owner
- name: Category name (e.g., "Fresh Produce", "Beverages")
- description: Category description
- parent_category_id: For hierarchical categories
- category_type: food, beverage, supplies, equipment, cleaning, other
- is_active: Whether category is active
```

#### 2. **suppliers**
Manages vendor information and relationships.

```sql
- id: Unique identifier
- business_id: Links to business owner
- name: Supplier company name
- contact_person: Primary contact
- email, phone, address: Contact information
- tax_id: Tax identification
- payment_terms: Payment conditions
- credit_limit: Maximum credit allowed
- current_balance: Outstanding balance
- rating: Supplier performance rating (1-5)
```

#### 3. **inventory_items**
Main inventory items with stock levels and pricing.

```sql
- id: Unique identifier
- business_id: Links to business owner
- category_id: Links to category
- supplier_id: Links to supplier
- name: Item name
- description: Item description
- sku: Stock keeping unit (unique)
- barcode: Barcode for scanning
- unit_of_measure: pieces, kg, grams, liters, ml, boxes, bottles, cans, bags, packs, units
- current_stock: Available quantity
- minimum_stock: Minimum level before alert
- maximum_stock: Maximum stock level
- reorder_point: Level to trigger reorder
- reorder_quantity: Recommended reorder amount
- unit_cost: Cost per unit
- selling_price: Price when sold standalone
- cost_per_unit: Calculated cost for recipes
- expiry_date: Expiration date for perishables
- location: Storage location
- is_perishable: Whether item expires
- is_alcoholic: Whether item contains alcohol
- is_ingredient: Whether used in menu recipes
```

#### 4. **inventory_transactions**
Records all inventory movements.

```sql
- id: Unique identifier
- business_id: Links to business owner
- item_id: Links to inventory item
- transaction_type: purchase, sale, adjustment, waste, transfer_in, transfer_out, return, damage, expiry
- quantity: Quantity moved
- unit_cost: Cost per unit
- total_cost: Total transaction value
- previous_stock: Stock before transaction
- new_stock: Stock after transaction
- reference_number: External reference
- supplier_id: Links to supplier (for purchases)
- order_id: Links to order (for sales)
- staff_id: Staff member who made transaction
- notes: Additional notes
- transaction_date: When transaction occurred
```

#### 5. **inventory_alerts**
System-generated alerts for various conditions.

```sql
- id: Unique identifier
- business_id: Links to business owner
- item_id: Links to inventory item
- alert_type: low_stock, out_of_stock, expiring_soon, expired, overstock, price_change
- severity: low, medium, high, critical
- message: Alert message
- is_resolved: Whether alert is resolved
- resolved_by: Staff who resolved alert
- resolved_at: When alert was resolved
```

### Supporting Tables

#### 6. **purchase_orders**
Manages orders to suppliers.

```sql
- id: Unique identifier
- business_id: Links to business owner
- supplier_id: Links to supplier
- po_number: Purchase order number
- order_date: When order was created
- expected_delivery_date: Expected delivery
- delivery_date: Actual delivery date
- status: draft, sent, confirmed, received, cancelled
- subtotal, tax_amount, shipping_cost, total_amount: Financial details
- notes: Order notes
- created_by: Staff who created order
```

#### 7. **purchase_order_items**
Individual items in purchase orders.

```sql
- id: Unique identifier
- purchase_order_id: Links to purchase order
- item_id: Links to inventory item
- quantity_ordered: Quantity requested
- quantity_received: Quantity actually received
- unit_cost: Cost per unit
- total_cost: Total item cost
```

#### 8. **inventory_adjustments**
Bulk inventory adjustments (counts, damage, etc.).

```sql
- id: Unique identifier
- business_id: Links to business owner
- adjustment_type: count, damage, waste, theft, quality_control, other
- reason: Reason for adjustment
- adjustment_date: When adjustment occurred
- total_value: Total adjustment value
- notes: Adjustment notes
- created_by: Staff who made adjustment
```

#### 9. **inventory_count_sessions**
Physical inventory count sessions.

```sql
- id: Unique identifier
- business_id: Links to business owner
- session_name: Count session name
- count_type: full, partial, cycle
- status: planned, in_progress, completed, cancelled
- start_date, end_date: Session dates
- notes: Session notes
- created_by: Staff who created session
```

#### 10. **menu_item_ingredients**
Links menu items to required inventory ingredients.

```sql
- id: Unique identifier
- menu_item_id: Links to menu item
- inventory_item_id: Links to inventory item
- quantity_required: Quantity needed per menu item
- unit_of_measure: Unit of measurement
- is_optional: Whether ingredient is optional
- notes: Additional notes
```

## Automated Features

### 1. **Automatic Stock Updates**
- Stock levels automatically update when transactions are recorded
- Triggers fire to maintain accurate inventory counts
- Real-time synchronization across all operations

### 2. **Smart Alerts**
- **Low Stock Alerts**: Triggered when stock falls below minimum levels
- **Expiry Alerts**: Warnings for items approaching expiration
- **Out of Stock Alerts**: Critical alerts for depleted items
- **Overstock Alerts**: Notifications for excessive inventory

### 3. **Automatic Calculations**
- **Cost Calculations**: Automatic cost per unit calculations
- **Valuation**: Real-time inventory value calculations
- **Reorder Suggestions**: Automatic reorder quantity suggestions

## Views for Common Queries

### 1. **low_stock_items**
Shows all items currently below minimum stock levels.

```sql
SELECT * FROM public.low_stock_items;
```

### 2. **expiring_items**
Shows items approaching expiration within 30 days.

```sql
SELECT * FROM public.expiring_items;
```

### 3. **inventory_valuation**
Shows current inventory value by item and category.

```sql
SELECT * FROM public.inventory_valuation;
```

### 4. **recent_inventory_transactions**
Shows recent inventory movements with details.

```sql
SELECT * FROM public.recent_inventory_transactions;
```

## Integration with Existing System

### Menu Integration
- Link menu items to inventory ingredients
- Track ingredient usage when orders are placed
- Automatic stock deduction for menu items

### Order Integration
- Connect inventory transactions to orders
- Track ingredient consumption per order
- Maintain recipe cost calculations

### Staff Integration
- Staff permissions for inventory management
- Track who made inventory changes
- Role-based access control

## Usage Examples

### 1. **Adding a New Inventory Item**

```sql
INSERT INTO public.inventory_items (
  business_id,
  category_id,
  supplier_id,
  name,
  description,
  sku,
  unit_of_measure,
  minimum_stock,
  reorder_point,
  reorder_quantity,
  unit_cost,
  is_perishable,
  expiry_date
) VALUES (
  'your-business-id',
  'category-uuid',
  'supplier-uuid',
  'Fresh Tomatoes',
  'Fresh red tomatoes for salads and cooking',
  'TOM-001',
  'kg',
  10,
  15,
  50,
  500,
  true,
  '2024-02-15'
);
```

### 2. **Recording a Purchase Transaction**

```sql
INSERT INTO public.inventory_transactions (
  business_id,
  item_id,
  transaction_type,
  quantity,
  unit_cost,
  total_cost,
  previous_stock,
  new_stock,
  supplier_id,
  staff_id,
  notes
) VALUES (
  'your-business-id',
  'item-uuid',
  'purchase',
  25,
  500,
  12500,
  10,
  35,
  'supplier-uuid',
  'staff-uuid',
  'Weekly tomato purchase'
);
```

### 3. **Creating a Purchase Order**

```sql
INSERT INTO public.purchase_orders (
  business_id,
  supplier_id,
  po_number,
  status,
  created_by
) VALUES (
  'your-business-id',
  'supplier-uuid',
  'PO-2024-001',
  'draft',
  'staff-uuid'
);
```

## Best Practices

### 1. **Stock Management**
- Set appropriate minimum stock levels
- Use reorder points to prevent stockouts
- Regularly review and adjust stock levels
- Conduct periodic physical counts

### 2. **Category Organization**
- Create logical category hierarchies
- Use consistent naming conventions
- Group similar items together
- Maintain category descriptions

### 3. **Supplier Management**
- Maintain accurate supplier information
- Track supplier performance
- Set appropriate credit limits
- Monitor payment terms

### 4. **Alert Management**
- Respond to alerts promptly
- Resolve alerts when issues are addressed
- Use alert severity to prioritize actions
- Document resolution actions

### 5. **Data Accuracy**
- Record transactions promptly
- Verify quantities during receiving
- Conduct regular inventory counts
- Investigate discrepancies immediately

## Reporting Capabilities

### 1. **Stock Level Reports**
- Current stock levels by category
- Items below minimum levels
- Items approaching expiry
- Overstock items

### 2. **Movement Reports**
- Daily/weekly/monthly usage
- Most/least used items
- Seasonal usage patterns
- Supplier performance

### 3. **Valuation Reports**
- Total inventory value
- Value by category
- Cost of goods sold
- Profit margin analysis

### 4. **Usage Analytics**
- Consumption trends
- Peak usage periods
- Waste analysis
- Efficiency metrics

## Security and Permissions

### Role-Based Access
- **Kitchen Staff**: View and update kitchen inventory
- **Bar Staff**: View and update bar inventory
- **Management**: Full inventory access
- **Accountants**: View reports and valuations

### Audit Trail
- All inventory changes are logged
- Track who made changes and when
- Maintain transaction history
- Support for compliance requirements

## Troubleshooting

### Common Issues

1. **Stock Discrepancies**
   - Conduct physical count
   - Review recent transactions
   - Check for unrecorded movements
   - Verify unit conversions

2. **Alert Overload**
   - Review minimum stock levels
   - Adjust reorder points
   - Resolve existing alerts
   - Fine-tune alert thresholds

3. **Performance Issues**
   - Check database indexes
   - Optimize queries
   - Archive old transactions
   - Monitor system resources

### Support Resources
- Database views for common queries
- Automated triggers for consistency
- Comprehensive logging for debugging
- Integration with existing systems

## Future Enhancements

### Planned Features
- **Barcode Scanning**: Mobile app integration
- **Predictive Analytics**: AI-powered demand forecasting
- **Multi-location Support**: Advanced location management
- **API Integration**: Third-party system connections
- **Advanced Reporting**: Custom report builder
- **Mobile App**: Inventory management on mobile devices

This inventory management system provides a robust foundation for tracking and managing inventory in restaurants and hotels, with comprehensive features for stock control, automated alerts, and detailed reporting.
