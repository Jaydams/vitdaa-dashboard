-- ✅ FINAL CORRECTED PERFORMANCE OPTIMIZATION INDEXES
-- Removed all non-IMMUTABLE functions from index predicates

-- ✅ STAFF ACTIVITY LOGS INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_performance_query 
ON staff_activity_logs(staff_id, shift_date, activity_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_business_analysis 
ON staff_activity_logs(business_id, shift_date, activity_type) 
INCLUDE (performance_metrics);

-- Removed NOW() function - use application-level filtering instead
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_recent 
ON staff_activity_logs(business_id, timestamp DESC);

-- ✅ INVENTORY REQUESTS INDEXES
CREATE INDEX IF NOT EXISTS idx_inventory_requests_admin_workflow 
ON inventory_requests(business_id, status, urgency_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_history 
ON inventory_requests(requested_by_staff_id, created_at DESC) 
INCLUDE (status, total_estimated_cost);

CREATE INDEX IF NOT EXISTS idx_inventory_requests_pending_urgent 
ON inventory_requests(business_id, urgency_level, created_at ASC) 
WHERE status = 'pending';

-- ✅ ORDERS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_staff_assignment 
ON orders(assigned_to_staff_id, status, created_at DESC) 
WHERE assigned_to_staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_kitchen_processing 
ON orders(business_id, status, priority_level, created_at ASC) 
WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_orders_table_management 
ON orders(business_id, table_id, status, created_at DESC) 
WHERE table_id IS NOT NULL;

-- ✅ ORDER ITEMS INDEXES
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_processing 
ON order_items(item_status, assigned_to_staff_id, created_at ASC) 
WHERE item_status IN ('pending', 'preparing') AND is_kitchen_item = true;

CREATE INDEX IF NOT EXISTS idx_order_items_bar_processing 
ON order_items(item_status, assigned_to_staff_id, created_at ASC) 
WHERE item_status IN ('pending', 'preparing') AND is_bar_item = true;

-- ✅ INVENTORY ITEMS INDEXES
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_alerts 
ON inventory_items(business_id, current_stock, minimum_stock, is_available) 
WHERE current_stock <= minimum_stock OR NOT is_available;

CREATE INDEX IF NOT EXISTS idx_inventory_items_category_available 
ON inventory_items(business_id, category_id, is_available, current_stock DESC);

-- ✅ STAFF AND SESSION INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_role_business 
ON staff(business_id, role, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_sessions_active 
ON staff_sessions(staff_id, is_active, expires_at DESC) 
WHERE is_active = true;

-- ✅ REAL-TIME SYNC INDEXES
CREATE INDEX IF NOT EXISTS idx_dashboard_events_realtime_sync 
ON dashboard_events(business_id, type, timestamp DESC, priority) 
WHERE processed_at IS NULL;

-- ✅ PARTIAL INDEXES FOR ACTIVE DATA
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_active 
ON inventory_alerts(business_id, severity, created_at DESC) 
WHERE is_resolved = false;

-- Removed CURRENT_DATE - use application-level filtering instead
CREATE INDEX IF NOT EXISTS idx_orders_recent 
ON orders(business_id, status, created_at DESC);

-- ✅ SIMPLE COLUMN INDEXES (NO FUNCTIONS)
CREATE INDEX IF NOT EXISTS idx_orders_created_date 
ON orders(business_id, created_at, status);

CREATE INDEX IF NOT EXISTS idx_orders_business_status 
ON orders(business_id, status, created_at DESC);

-- ✅ ADDITIONAL PERFORMANCE INDEXES FOR COMMON QUERIES

-- Index for payment processing (accountant dashboard)
CREATE INDEX IF NOT EXISTS idx_payments_business_date_status 
ON payments(business_id, created_at DESC, status);

-- Index for customer management (reception dashboard)
CREATE INDEX IF NOT EXISTS idx_customers_business_name 
ON customers(business_id, first_name, last_name);

-- Index for table management
CREATE INDEX IF NOT EXISTS idx_tables_business_status 
ON tables(business_id, status) 
WHERE status IN ('available', 'occupied', 'reserved');

-- Index for menu items performance
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_status 
ON menu_items(menu_id, status) 
WHERE status = 'available';

-- Index for audit logs (compliance and investigation)
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_date 
ON audit_logs(business_id, created_at DESC);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_staff_unread 
ON notifications(staff_id, is_read, created_at DESC) 
WHERE is_read = false;

-- ✅ COVERING INDEXES FOR FREQUENTLY ACCESSED DATA

-- Covering index for order summary queries
CREATE INDEX IF NOT EXISTS idx_orders_summary_covering 
ON orders(business_id, status, created_at) 
INCLUDE (total_amount, customer_name, dining_option, payment_method);

-- Covering index for inventory summary
CREATE INDEX IF NOT EXISTS idx_inventory_summary_covering 
ON inventory_items(business_id, is_available) 
INCLUDE (name, current_stock, minimum_stock, unit_cost, unit_of_measure);

-- Covering index for staff activity summary
CREATE INDEX IF NOT EXISTS idx_staff_activity_summary_covering 
ON staff_activity_logs(staff_id, shift_date) 
INCLUDE (activity_type, performance_metrics, timestamp);

-- ✅ ADDITIONAL COMPOSITE INDEXES FOR COMMON QUERY PATTERNS

-- For staff performance queries
CREATE INDEX IF NOT EXISTS idx_staff_activity_performance 
ON staff_activity_logs(staff_id, activity_type, timestamp DESC);

-- For inventory request workflow
CREATE INDEX IF NOT EXISTS idx_inventory_requests_workflow 
ON inventory_requests(business_id, status, created_at DESC);

-- For order processing workflow
CREATE INDEX IF NOT EXISTS idx_orders_processing_workflow 
ON orders(business_id, status, created_at ASC);

-- For real-time dashboard updates
CREATE INDEX IF NOT EXISTS idx_dashboard_events_business_type 
ON dashboard_events(business_id, type, timestamp DESC);

-- For notification system
CREATE INDEX IF NOT EXISTS idx_notifications_delivery 
ON notifications(staff_id, created_at DESC);

-- ✅ ANALYZE STATEMENTS TO UPDATE QUERY PLANNER
ANALYZE orders;
ANALYZE order_items;
ANALYZE inventory_items;
ANALYZE inventory_requests;
ANALYZE inventory_request_items;
ANALYZE staff_activity_logs;
ANALYZE staff;
ANALYZE staff_sessions;
ANALYZE dashboard_events;
ANALYZE payments;
ANALYZE customers;
ANALYZE tables;
ANALYZE menu_items;
ANALYZE audit_logs;
ANALYZE notifications;

-- ✅ FINAL ANALYZE TO UPDATE ALL STATISTICS
ANALYZE;

-- Success message
SELECT 'All performance optimization indexes created successfully!' as status,
       'Use application-level date filtering for time-based queries' as note;