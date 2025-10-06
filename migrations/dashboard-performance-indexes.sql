-- Dashboard Performance Optimization Indexes
-- This migration adds indexes to optimize dashboard analytics queries
-- Requirements: 1.7, 2.6, 3.6

-- =====================================================
-- ORDERS TABLE INDEXES
-- =====================================================

-- Primary index for dashboard queries filtering by business_id, date, and status
-- Optimizes queries for sales metrics and order status counts
CREATE INDEX IF NOT EXISTS idx_orders_business_date_status 
ON orders(business_id, created_at, status);

-- Index for date-based queries (used for daily, weekly, monthly aggregations)
-- Optimizes queries that filter by business_id and date ranges
-- Note: Using created_at directly instead of DATE(created_at) to avoid IMMUTABLE function requirement
-- Use created_at::date or date range comparisons in queries for best performance
CREATE INDEX IF NOT EXISTS idx_orders_business_date 
ON orders(business_id, created_at);

-- Index for order time queries (used for peak hours analysis)
-- Optimizes queries that analyze order patterns by time
CREATE INDEX IF NOT EXISTS idx_orders_business_order_time 
ON orders(business_id, order_time);

-- Index for completed/delivered orders (used for sales calculations)
-- Optimizes queries that only include completed orders for revenue calculations
CREATE INDEX IF NOT EXISTS idx_orders_completed_status 
ON orders(created_at, status, business_id) 
WHERE status IN ('delivered', 'completed');

-- Index for total amount queries (used for sales aggregations)
-- Optimizes queries that sum total amounts for sales metrics
CREATE INDEX IF NOT EXISTS idx_orders_business_amount_date 
ON orders(business_id, total_amount, created_at) 
WHERE status IN ('delivered', 'completed');

-- =====================================================
-- ORDER_ITEMS TABLE INDEXES
-- =====================================================

-- Primary index for best sellers queries
-- Optimizes queries that aggregate menu item sales by name and quantity
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_quantity 
ON order_items(menu_item_name, quantity);

-- Index for order items with order relationship
-- Optimizes joins between orders and order_items for analytics
CREATE INDEX IF NOT EXISTS idx_order_items_order_menu 
ON order_items(order_id, menu_item_name, quantity);

-- Composite index for best sellers with date filtering
-- Optimizes queries that find best sellers within date ranges
CREATE INDEX IF NOT EXISTS idx_order_items_menu_created 
ON order_items(menu_item_name, created_at, quantity);

-- =====================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =====================================================

-- Index for customer analysis (unique customers count)
-- Optimizes queries that count unique customers per business
CREATE INDEX IF NOT EXISTS idx_orders_business_customer 
ON orders(business_id, customer_id, created_at) 
WHERE customer_id IS NOT NULL;

-- Index for dining option analysis (indoor vs delivery)
-- Optimizes queries that analyze dining preferences
CREATE INDEX IF NOT EXISTS idx_orders_dining_option 
ON orders(business_id, dining_option, created_at);

-- Index for payment method analysis
-- Optimizes queries that analyze payment method preferences
CREATE INDEX IF NOT EXISTS idx_orders_payment_method 
ON orders(business_id, payment_method, created_at);

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================

-- These indexes are designed to optimize the following dashboard queries:
-- 1. Sales metrics by date ranges (today, yesterday, this month, last month, all-time)
-- 2. Order status counts (pending, processing, delivered, cancelled)
-- 3. Weekly sales trends and order counts
-- 4. Best-selling menu items aggregation
-- 5. Additional analytics (average order value, peak hours, unique customers)
-- 6. Dining option and payment method analysis

-- Index maintenance:
-- - PostgreSQL automatically maintains these indexes
-- - Consider running ANALYZE after creating indexes for optimal query planning
-- - Monitor index usage with pg_stat_user_indexes view

-- Query optimization tips:
-- - Always include business_id in WHERE clauses for multi-tenant isolation
-- - Use DATE_TRUNC() for date filtering (e.g., DATE_TRUNC('day', created_at))
-- - For date-only comparisons, use created_at::date or date range comparisons
-- - Include status filters early in WHERE clauses for completed orders
-- - Use LIMIT clauses for best sellers queries to improve performance