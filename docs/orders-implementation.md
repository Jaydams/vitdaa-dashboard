# Orders Implementation

This document describes the orders functionality implementation for the restaurant management system.

## Database Schema

### Tables Created

1. **customers** - Stores customer information
2. **orders** - Main orders table with all order details
3. **order_items** - Individual items in each order
4. **payments** - Payment records for orders

### Key Features

- Automatic invoice number generation (YYYYMMDD-XXXX format)
- Support for both indoor dining and delivery orders
- Takeaway pack management
- Delivery location and rider information
- VAT and service charge calculations
- Multiple payment methods (cash, wallet, card)
- **Table reservation and management**
- **Manual order creation from admin panel**

## API Endpoints

### POST /api/orders
Creates a new order from the frontend application.

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_phone": "+2348012345678",
  "customer_address": "123 Main St",
  "dining_option": "delivery",
  "table_id": "uuid",
  "takeaway_packs": 2,
  "takeaway_pack_price": 100,
  "delivery_location_id": "uuid",
  "delivery_fee": 500,
  "rider_name": "Mike Johnson",
  "rider_phone": "+2348098765432",
  "payment_method": "cash",
  "items": [
    {
      "menu_item_id": 1,
      "menu_item_name": "Jollof Rice",
      "menu_item_price": 2500,
      "quantity": 2,
      "total_price": 5000
    }
  ],
  "subtotal": 5000,
  "vat_amount": 375,
  "service_charge": 125,
  "total_amount": 5500,
  "notes": "Extra spicy please"
}
```

### GET /api/orders/stats
Returns order statistics for the dashboard.

## Server Actions

### fetchOrders
Fetches paginated orders with filtering options.

### fetchOrder
Fetches a single order with all related data.

### updateOrderStatus
Updates the status of an order and manages table status.

### createOrder
Creates a new order with items and payment record.

### updateTableStatus
Updates table availability status.

### getOrderStats
Gets order statistics for dashboard display.

## Frontend Integration

### Orders Table
- Displays orders with pagination
- Status filtering and search
- Status update functionality
- Print and view invoice actions

### Order Detail Page
- Complete order information display
- Customer details
- Payment breakdown
- Order items list
- Print invoice functionality

### Create Order Form
- **Manual order creation from admin panel**
- Customer information input
- Menu item selection with quantity
- Table reservation for indoor dining
- Delivery settings for delivery orders
- Payment method selection
- Real-time total calculation
- Order notes and special instructions

### Table Status Component
- **Real-time table availability display**
- Visual status indicators (available, occupied, reserved)
- Table capacity information
- Quick overview of restaurant capacity

## Order Flow

1. **Customer places order** via frontend app OR **Admin creates order** via dashboard
2. **Order data sent** to `/api/orders` endpoint
3. **Order created** in database with items and payment
4. **Invoice number** automatically generated
5. **Table status updated** if indoor dining
6. **Order appears** in dashboard orders table
7. **Status can be updated** by restaurant staff
8. **Table released** when order completed/cancelled
9. **Order details** viewable in detail page

## Status Flow

- **pending** → **processing** → **delivered**
- Orders can be **cancelled** at any stage
- **Table status**: available → occupied → available (when order completed)

## Payment Methods

- **cash** - Payment status automatically set to "completed"
- **wallet** - Payment status set to "pending" (requires wallet integration)
- **card** - Payment status set to "pending" (requires payment gateway integration)

## Table Management

### Table Statuses
- **available** - Table is free for new orders
- **occupied** - Table has an active order
- **reserved** - Table is reserved for future use

### Automatic Table Management
- Tables are automatically marked as "occupied" when an indoor order is created
- Tables are automatically released as "available" when order is delivered or cancelled
- Tables remain "occupied" during processing status

## Calculations

- **VAT**: 7.5% of subtotal
- **Service Charge**: 2.5% of subtotal
- **Total**: subtotal + VAT + service_charge + takeaway_packs + delivery_fee

## Database Migration

Run the migration file to create the orders tables:

```sql
-- Run the migration file
database/migrations/2025-01-15_create_orders_tables.sql
```

## Sample Data

Use the sample data file to populate your database for testing:

```sql
-- Run the sample data file
data/sample-data.sql
```

**Note**: The sample data uses the actual business owner ID (`73bf3020-60dc-4323-bd09-04313b59a53f`) from your CSV export and real menu items from your menu_items CSV. The data is specifically for "The Blueplate Restaurant" in Kaduna.

### Data Structure

The sample data includes:
- **8 tables** for The Blueplate Restaurant
- **6 delivery locations** in Kaduna State
- **3 takeaway pack options**
- **5 sample customers** with Kaduna addresses
- **4 sample orders** with different statuses (pending, processing, delivered, cancelled)
- **Real menu items** from your CSV (Jollof Rice, Crispy Fried Chicken, BBQ Pizza, etc.)
- **Proper calculations** with VAT (7.5%) and service charge (2.5%)

### Business Isolation

The system ensures that:
- Each business owner only sees their own menu items
- Tables are filtered by business owner
- Delivery locations are business-specific
- Orders are created only for the current business owner
- No cross-business data leakage

## Testing

### Manual Testing
1. Navigate to `/orders` page
2. Click "Create Order" button
3. Fill in customer information
4. Select dining option (indoor/delivery)
5. Choose table for indoor dining
6. Add menu items with quantities
7. Review order summary
8. Submit order
9. Verify order appears in orders table
10. Test status updates and table management

### Automated Testing
Use the test script in `test/orders-test.ts` to verify functionality:

```typescript
import { runTests } from './test/orders-test';
runTests();
```

## Components Created

1. **CreateOrderButton** - Button to open order creation dialog
2. **CreateOrderForm** - Comprehensive form for manual order creation
3. **TableStatus** - Component to display table availability
4. **Updated Orders Page** - Enhanced with create order functionality

## Future Enhancements

1. **Email notifications** for order status changes
2. **SMS notifications** for delivery orders
3. **Payment gateway integration** for card payments
4. **Wallet integration** for wallet payments
5. **Order tracking** for delivery orders
6. **Customer feedback** system
7. **Order analytics** and reporting
8. **Inventory management** integration
9. **Table reservation system** for future bookings
10. **Kitchen display system** integration 