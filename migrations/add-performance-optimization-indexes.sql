-- Performance Optimization Indexes for Staff Dashboards
-- This migration adds comprehensive indexes for optimal query performance
-- Date: 2025-01-13

-- =====================================================
-- STAFF ACTIVITY LOGS PERFORMANCE INDEXES
-- =====================================================

-- Composite index for staff performance queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_performance_query 
ON staff_activity_logs(staff_id, shift_date, activity_type, timestamp DESC);

-- Index for business-wide activity analysis
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_business_analysis 
ON staff_activity_logs(business_id, shift_date, activity_type) 
INCLUDE (performance_metrics);

-- Index for real-time activity monitoring (recent activities)
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_recent 
ON staff_activity_logs(business_id, timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '24 hours';

-- Index for activity type filtering with performance metrics
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_type_metrics 
ON staff_activity_logs(activity_type, timestamp DESC) 
INCLUDE (staff_id, performance_metrics);

-- =====================================================
-- INVENTORY REQUESTS PERFORMANCE INDEXES
-- =====================================================

-- Composite index for admin approval workflow
CREATE INDEX IF NOT EXISTS idx_inventory_requests_admin_workflow 
ON inventory_requests(business_id, status, urgency_level, created_at DESC);

-- Index for staff request history and tracking
CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_history 
ON inventory_requests(requested_by_staff_id, created_at DESC) 
INCLUDE (status, total_estimated_cost);

-- Index for pending requests with urgency (admin dashboard priority)
CREATE INDEX IF NOT EXISTS idx_inventory_requests_pending_urgent 
ON inventory_requests(business_id, urgency_level, created_at ASC) 
WHERE status = 'pending';

-- Index for approved requests with cost analysis
CREATE INDEX IF NOT EXISTS idx_inventory_requests_approved_costs 
ON inventory_requests(business_id, approved_at DESC, total_estimated_cost) 
WHERE status IN ('approved', 'partially_approved');

-- =====================================================
-- INVENTORY REQUEST ITEMS PERFORMANCE INDEXES
-- =====================================================

-- Index for item-level request analysis
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_analysis 
ON inventory_request_items(inventory_item_id, created_at DESC) 
INCLUDE (requested_quantity, approved_quantity, estimated_unit_cost);

-- Index for supplier-based request tracking
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_supplier 
ON inventory_request_items(supplier_id, created_at DESC) 
WHERE supplier_id IS NOT NULL;

-- Index for cost variance analysis (requested vs approved costs)
CREATE INDEX IF NOT EXISTS idx_inventory_request_items_cost_variance 
ON inventory_request_items(estimated_unit_cost, approved_unit_cost) 
WHERE approved_unit_cost IS NOT NULL;

-- =====================================================
-- EXISTING TABLES OPTIMIZATION INDEXES
-- =====================================================

-- Enhanced orders table indexes for staff dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_staff_assignment 
ON orders(assigned_to_staff_id, status, created_at DESC) 
WHERE assigned_to_staff_id IS NOT NULL;

-- Index for kitchen dashboard order processing
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_processing 
ON orders(business_id, status, priority_level, created_at ASC) 
WHERE status IN ('pending', 'processing');

-- Index for reception dashboard table management
CREATE INDEX IF NOT EXISTS idx_orders_table_management 
ON orders(business_id, table_id, status, created_at DESC) 
WHERE table_id IS NOT NULL;

-- Enhanced order_items indexes for kitchen/bar dashboards
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_processing 
ON order_items(item_status, assigned_to_staff_id, created_at ASC) 
WHERE item_status IN ('pending', 'preparing') AND is_kitchen_item = true;

-- Index for bar dashboard beverage processing
CREATE INDEX IF NOT EXISTS idx_order_items_bar_processing 
ON order_items(item_status, assigned_to_staff_id, created_at ASC) 
WHERE item_status IN ('pending', 'preparing') AND is_bar_item = true;

-- Index for order item preparation time analysis
CREATE INDEX IF NOT EXISTS idx_order_items_preparation_time 
ON order_items(preparation_started_at, preparation_completed_at) 
WHERE preparation_started_at IS NOT NULL;

-- Enhanced inventory_items indexes for stock management
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_alerts 
ON inventory_items(business_id, current_stock, minimum_stock, is_available) 
WHERE current_stock <= minimum_stock OR NOT is_available;

-- Index for inventory items by category and availability
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_available 
ON inventory_items(business_id, category_id, is_available, current_stock DESC);

-- Index for perishable items expiry tracking
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry 
ON inventory_items(business_id, expiry_date ASC, is_perishable) 
WHERE is_perishable = true AND expiry_date IS NOT NULL;

-- Enhanced staff table indexes for session and performance tracking
CREATE INDEX IF NOT EXISTS idx_staff_role_business 
ON staff(business_id, role, is_active) 
WHERE is_active = true;

-- Index for staff session management
CREATE INDEX IF NOT EXISTS idx_staff_sessions_active 
ON staff_sessions(staff_id, is_active, expires_at DESC) 
WHERE is_active = true;

-- Enhanced payments table indexes for accountant dashboard
CREATE INDEX IF NOT EXISTS idx_payments_business_date_method 
ON payments(business_id, created_at DESC, payment_method, status);

-- Index for payment refund processing
CREATE INDEX IF NOT EXISTS idx_payments_refund_processing 
ON payments(business_id, status, created_at DESC) 
WHERE status IN ('refund_requested', 'refund_processing');

-- Enhanced tables index for reception dashboard
CREATE INDEX IF NOT EXISTS idx_tables_business_status 
ON tables(business_id, status, capacity) 
WHERE status IN ('available', 'occupied', 'reserved');

-- =====================================================
-- REAL-TIME SYNC PERFORMANCE INDEXES
-- =====================================================

-- Enhanced dashboard events indexes for real-time sync
CREATE INDEX IF NOT EXISTS idx_dashboard_events_realtime_sync 
ON dashboard_events(business_id, type, timestamp DESC, priority) 
WHERE processed_at IS NULL;

-- Index for notification delivery performance
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_unread 
ON notification_deliveries(staff_id, is_read, delivered_at DESC) 
WHERE is_read = false;

-- Index for offline action queue processing
CREATE INDEX IF NOT EXISTS idx_offline_action_queue_processing 
ON offline_action_queue(staff_id, status, created_at ASC, retry_count) 
WHERE status IN ('pending', 'processing') AND expires_at > NOW();

-- =====================================================
-- AUDIT AND COMPLIANCE INDEXES
-- =====================================================

-- Enhanced audit_logs indexes for compliance and investigation
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_date_action 
ON audit_logs(business_id, created_at DESC, action) 
INCLUDE (staff_id, target_type, target_id);

-- Index for staff-specific audit trail
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_timeline 
ON audit_logs(staff_id, created_at DESC) 
INCLUDE (action, target_type, details);

-- Index for target-specific audit trail (e.g., order audit history)
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_history 
ON audit_logs(target_type, target_id, created_at DESC) 
INCLUDE (staff_id, action, details);

-- =====================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =====================================================

-- Index for active inventory alerts only
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_active 
ON inventory_alerts(business_id, severity, created_at DESC) 
WHERE is_resolved = false;

-- Index for current staff sessions only
CREATE INDEX IF NOT EXISTS idx_staff_sessions_current 
ON staff_sessions(business_id, staff_id, last_activity DESC) 
WHERE is_active = true AND expires_at > NOW();

-- Index for today's orders only (frequently accessed)
CREATE INDEX IF NOT EXISTS idx_orders_today 
ON orders(business_id, status, created_at DESC) 
WHERE created_at >= CURRENT_DATE;

-- Index for pending inventory requests only
CREATE INDEX IF NOT EXISTS idx_inventory_requests_pending_only 
ON inventory_requests(business_id, urgency_level, created_at ASC) 
WHERE status = 'pending';

-- =====================================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- =====================================================

-- Index for order date (without time) for daily aggregations
CREATE INDEX IF NOT EXISTS idx_orders_date_only 
ON orders(business_id, (created_at::date), status);

-- Index for order hour for peak time analysis
CREATE INDEX IF NOT EXISTS idx_orders_hour_analysis 
ON orders(business_id, EXTRACT(hour FROM created_at), created_at::date);

-- Index for staff activity date grouping
CREATE INDEX IF NOT EXISTS idx_staff_activity_date_grouping 
ON staff_activity_logs(staff_id, (timestamp::date), activity_type);

-- =====================================================
-- COVERING INDEXES FOR COMMON QUERIES
-- =====================================================

-- Covering index for order summary queries
CREATE INDEX IF NOT EXISTS idx_orders_summary_covering 
ON orders(business_id, status, created_at) 
INCLUDE (total_amount, customer_name, dining_option);

-- Covering index for inventory item summary
CREATE INDEX IF NOT EXISTS idx_inventory_items_summary_covering 
ON inventory_items(business_id, is_available) 
INCLUDE (name, current_stock, minimum_stock, unit_cost);

-- Covering index for staff performance summary
CREATE INDEX IF NOT EXISTS idx_staff_activity_summary_covering 
ON staff_activity_logs(staff_id, shift_date) 
INCLUDE (activity_type, performance_metrics);

-- =====================================================
-- MAINTENANCE AND MONITORING
-- =====================================================

-- Create function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname,
    s.tablename,
    s.indexname,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
  FROM pg_stat_user_indexes s
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$ LANGUAGE plpgsql;

-- Create function to identify unused indexes
CREATE OR REPLACE FUNCTION identify_unused_indexes()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  index_size text
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname,
    s.tablename,
    s.indexname,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
  FROM pg_stat_user_indexes s
  WHERE s.idx_scan = 0 
    AND s.schemaname = 'public'
    AND s.indexname NOT LIKE '%_pkey'
  ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION analyze_index_usage() IS 'Analyzes index usage statistics for performance monitoring';
COMMENT ON FUNCTION identify_unused_indexes() IS 'Identifies potentially unused indexes for cleanup consideration';

-- Add table comments for new indexes
COMMENT ON INDEX idx_staff_activity_logs_performance_query IS 'Optimizes staff performance queries by date and activity type';
COMMENT ON INDEX idx_inventory_requests_admin_workflow IS 'Optimizes admin inventory approval workflow queries';
COMMENT ON INDEX idx_orders_kitchen_processing IS 'Optimizes kitchen dashboard order processing queries';
COMMENT ON INDEX idx_order_items_kitchen_processing IS 'Optimizes kitchen item preparation tracking';
COMMENT ON INDEX idx_inventory_items_stock_alerts IS 'Optimizes low stock and availability alerts';

-- Performance optimization notes
-- These indexes are designed to optimize:
-- 1. Staff dashboard real-time queries
-- 2. Inventory request workflow performance
-- 3. Order processing and tracking
-- 4. Real-time synchronization
-- 5. Audit and compliance reporting
-- 6. Business intelligence and analytics

-- Maintenance recommendations:
-- 1. Run ANALYZE after creating indexes
-- 2. Monitor index usage with analyze_index_usage()
-- 3. Review unused indexes with identify_unused_indexes()
-- 4. Consider index maintenance during low-traffic periods
-- 5. Monitor query performance with pg_stat_statements