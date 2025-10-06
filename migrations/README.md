# Database Migrations

This directory contains database migration files for the Vitdaa POS system.

## Dashboard Performance Indexes Migration

### Overview

The `dashboard-performance-indexes.sql` migration adds optimized database indexes to improve the performance of dashboard analytics queries.

### What it does

- Adds indexes to the `orders` table for efficient filtering by business_id, date, and status
- Adds indexes to the `order_items` table for optimized best sellers queries
- Creates additional indexes for customer analysis, dining options, and payment methods

### Indexes Created

1. **idx_orders_business_date_status** - Primary index for dashboard queries
2. **idx_orders_business_date** - Date-based aggregations (uses created_at timestamp)
3. **idx_orders_business_order_time** - Peak hours analysis
4. **idx_orders_completed_status** - Sales calculations (completed orders only)
5. **idx_orders_business_amount_date** - Revenue aggregations
6. **idx_order_items_menu_item_quantity** - Best sellers queries
7. **idx_order_items_order_menu** - Order-item joins
8. **idx_order_items_menu_created** - Best sellers with date filtering
9. **idx_orders_business_customer** - Unique customers analysis
10. **idx_orders_dining_option** - Dining preferences analysis
11. **idx_orders_payment_method** - Payment method analysis

### How to Run

#### Prerequisites

1. Ensure you have Node.js installed
2. Set up your environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

#### Running the Migration

```bash
# From the Vitdaa POS root directory
node run_dashboard_migration.js
```

#### Alternative: Manual Execution

You can also run the migration manually in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `migrations/dashboard-performance-indexes.sql`
4. Execute the SQL

### Performance Impact

- **Positive**: Significantly faster dashboard queries, especially for:
  - Sales metrics calculations
  - Order status aggregations
  - Best sellers analysis
  - Date range filtering
- **Storage**: Minimal additional storage overhead
- **Maintenance**: PostgreSQL automatically maintains these indexes

### Monitoring

After running the migration, you can monitor index usage with:

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_orders%' OR indexname LIKE 'idx_order_items%'
ORDER BY idx_scan DESC;
```

### Rollback

If you need to remove these indexes:

```sql
DROP INDEX IF EXISTS idx_orders_business_date_status;
DROP INDEX IF EXISTS idx_orders_business_date;
DROP INDEX IF EXISTS idx_orders_business_order_time;
DROP INDEX IF EXISTS idx_orders_completed_status;
DROP INDEX IF EXISTS idx_orders_business_amount_date;
DROP INDEX IF EXISTS idx_order_items_menu_item_quantity;
DROP INDEX IF EXISTS idx_order_items_order_menu;
DROP INDEX IF EXISTS idx_order_items_menu_created;
DROP INDEX IF EXISTS idx_orders_business_customer;
DROP INDEX IF EXISTS idx_orders_dining_option;
DROP INDEX IF EXISTS idx_orders_payment_method;
```

### Troubleshooting

#### Common Issues

1. **"functions in index expression must be marked IMMUTABLE" error**

   - This occurs when using functions like `DATE()` in index expressions
   - Solution: Use the timestamp column directly and apply date functions in queries
   - Example: Use `created_at::date = CURRENT_DATE` instead of indexing on `DATE(created_at)`

2. **Index creation takes a long time**

   - This is normal for large tables
   - Indexes are created concurrently and won't block other operations
   - Monitor progress in Supabase logs

3. **Permission errors**
   - Ensure you're using the service role key or have proper database permissions
   - The migration requires CREATE INDEX privileges

### Requirements Addressed

- **Requirement 1.7**: Optimizes sales amount calculations with proper indexing
- **Requirement 2.6**: Improves order status metrics performance
- **Requirement 3.6**: Enhances best sellers and chart data query performance
