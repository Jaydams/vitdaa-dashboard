-- Enable Realtime for Hybrid Authentication System Tables
-- This migration enables realtime subscriptions for the core authentication tables

-- Enable realtime for restaurant shifts (shift status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_shifts;

-- Enable realtime for staff sessions (login/logout tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE staff_sessions;

-- Enable realtime for admin sessions (admin authentication tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE admin_sessions;

-- Enable realtime for audit logs (security monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- Optional: Enable realtime for staff table if you want to track staff changes
-- ALTER PUBLICATION supabase_realtime ADD TABLE staff;

-- Verify realtime is enabled (this will show the tables)
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';