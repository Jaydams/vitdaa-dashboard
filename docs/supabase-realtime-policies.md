# Supabase Realtime & RLS Policies for Orders

## Overview

This document describes the Row Level Security (RLS) policies and realtime subscriptions implemented for the orders management system.

## Realtime Implementation

### Current Realtime Subscriptions

The system uses Supabase realtime to automatically update the orders table when changes occur:

```typescript
// From hooks/useOrdersRealtime.ts
const channel = supabase
  .channel('orders-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
  }, (payload) => {
    console.log('Orders realtime change:', payload);
    loadOrders(); // Reload orders when changes occur
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'order_items',
  }, (payload) => {
    console.log('Order items realtime change:', payload);
    loadOrders(); // Reload orders when order items change
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'payments',
  }, (payload) => {
    console.log('Payments realtime change:', payload);
    loadOrders(); // Reload orders when payments change
  })
  .subscribe();
```

### Tables with Realtime Enabled

The following tables have realtime enabled:

1. **orders** - Main orders table
2. **order_items** - Order line items
3. **payments** - Payment records
4. **customers** - Customer information

## Row Level Security (RLS) Policies

### Orders Table Policies

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Business owners can view their own orders
CREATE POLICY "Business owners can view their own orders" ON orders
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- INSERT Policy: Business owners can insert their own orders
CREATE POLICY "Business owners can insert their own orders" ON orders
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- UPDATE Policy: Business owners can update their own orders
CREATE POLICY "Business owners can update their own orders" ON orders
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- DELETE Policy: Business owners can delete their own orders
CREATE POLICY "Business owners can delete their own orders" ON orders
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );
```

### Order Items Table Policies

```sql
-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Business owners can view their order items
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

-- INSERT Policy: Business owners can insert their order items
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

-- UPDATE Policy: Business owners can update their order items
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

-- DELETE Policy: Business owners can delete their order items
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
```

### Payments Table Policies

```sql
-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Business owners can view their payments
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

-- INSERT Policy: Business owners can insert their payments
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

-- UPDATE Policy: Business owners can update their payments
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

-- DELETE Policy: Business owners can delete their payments
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
```

### Customers Table Policies

```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Business owners can view their customers
CREATE POLICY "Business owners can view their customers" ON customers
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- INSERT Policy: Business owners can insert their customers
CREATE POLICY "Business owners can insert their customers" ON customers
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- UPDATE Policy: Business owners can update their customers
CREATE POLICY "Business owners can update their customers" ON customers
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- DELETE Policy: Business owners can delete their customers
CREATE POLICY "Business owners can delete their customers" ON customers
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM business_owner 
      WHERE email = auth.jwt() ->> 'email'
    )
  );
```

## Enabling Realtime for Tables

```sql
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
```

## Security Features

### Data Isolation
- Each business owner can only access their own data
- Policies use `auth.jwt() ->> 'email'` to identify the authenticated user
- Business owner ID is used to filter all data access

### Authentication Required
- All policies require authentication
- Policies check against the `business_owner` table using the authenticated user's email
- No anonymous access is allowed

### Cascade Relationships
- Order items and payments are linked to orders
- Policies ensure that related data access is properly scoped
- Deletion cascades are handled at the database level

## Benefits

### Real-time Updates
- Orders table updates automatically when changes occur
- No need to manually refresh the page
- Multiple users can see updates simultaneously

### Data Security
- Complete data isolation between businesses
- No cross-business data leakage
- Secure authentication-based access control

### Performance
- Efficient queries with proper indexing
- Minimal data transfer due to filtering
- Optimized for real-time operations

## Troubleshooting

### Common Issues

1. **Realtime not working**
   - Check if tables are added to `supabase_realtime` publication
   - Verify RLS policies are enabled
   - Ensure user is authenticated

2. **Permission denied errors**
   - Verify user email exists in `business_owner` table
   - Check if RLS policies are correctly applied
   - Ensure proper authentication

3. **Data not loading**
   - Check network connectivity
   - Verify Supabase client configuration
   - Review browser console for errors

### Debug Steps

1. Check Supabase dashboard for realtime logs
2. Verify RLS policies are active
3. Test authentication status
4. Review network requests in browser dev tools

## Migration Notes

When running the migration:

1. **Backup existing data** before applying policies
2. **Test policies** in development environment first
3. **Verify realtime subscriptions** work correctly
4. **Monitor performance** after enabling RLS

## Future Enhancements

1. **Advanced filtering** in realtime subscriptions
2. **Selective updates** to reduce unnecessary reloads
3. **Optimistic updates** for better UX
4. **Bulk operations** with proper policy handling 