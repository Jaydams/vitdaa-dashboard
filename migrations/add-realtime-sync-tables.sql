-- Migration: Add real-time synchronization and notification tables
-- This migration adds tables for real-time dashboard synchronization and notification system

-- Create dashboard events table for audit trail
CREATE TABLE IF NOT EXISTS dashboard_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  target_dashboards TEXT[] NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff dashboard subscriptions table
CREATE TABLE IF NOT EXISTS staff_dashboard_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('reception', 'kitchen', 'bar', 'accountant')),
  event_types TEXT[] NOT NULL DEFAULT '{}',
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  UNIQUE(staff_id, dashboard_type)
);

-- Create real-time notifications table
CREATE TABLE IF NOT EXISTS realtime_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  sender_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'inventory', 'table', 'payment', 'request', 'alert', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  target_staff_ids UUID[] NOT NULL DEFAULT '{}',
  target_dashboards TEXT[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  action_required BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  send_to_all BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Create notification deliveries table for tracking individual deliveries
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES realtime_notifications(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(notification_id, staff_id)
);

-- Create sync conflict resolution table
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  local_version JSONB NOT NULL,
  remote_version JSONB NOT NULL,
  resolution_strategy TEXT NOT NULL DEFAULT 'remote_wins' CHECK (resolution_strategy IN ('local_wins', 'remote_wins', 'merge', 'manual')),
  resolved_version JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offline action queue table
CREATE TABLE IF NOT EXISTS offline_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_events_business_id ON dashboard_events(business_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_timestamp ON dashboard_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_type ON dashboard_events(type);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_priority ON dashboard_events(priority);

CREATE INDEX IF NOT EXISTS idx_staff_dashboard_subscriptions_staff_id ON staff_dashboard_subscriptions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_dashboard_subscriptions_business_id ON staff_dashboard_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_dashboard_subscriptions_dashboard_type ON staff_dashboard_subscriptions(dashboard_type);

CREATE INDEX IF NOT EXISTS idx_realtime_notifications_business_id ON realtime_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_realtime_notifications_created_at ON realtime_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_notifications_priority ON realtime_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_realtime_notifications_expires_at ON realtime_notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_staff_id ON notification_deliveries(staff_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_is_read ON notification_deliveries(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_delivered_at ON notification_deliveries(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_business_id ON sync_conflicts(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resource_type ON sync_conflicts(resource_type);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_created_at ON sync_conflicts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offline_action_queue_staff_id ON offline_action_queue(staff_id);
CREATE INDEX IF NOT EXISTS idx_offline_action_queue_status ON offline_action_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_action_queue_created_at ON offline_action_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_action_queue_expires_at ON offline_action_queue(expires_at);

-- Create RLS policies for security

-- Dashboard events policies
ALTER TABLE dashboard_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view dashboard events for their business" ON dashboard_events
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert dashboard events for their business" ON dashboard_events
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- Staff dashboard subscriptions policies
ALTER TABLE staff_dashboard_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their own dashboard subscriptions" ON staff_dashboard_subscriptions
  FOR ALL USING (
    staff_id = auth.uid() OR
    business_id IN (
      SELECT business_id FROM staff 
      WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    )
  );

-- Real-time notifications policies
ALTER TABLE realtime_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view notifications for their business" ON realtime_notifications
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can create notifications for their business" ON realtime_notifications
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- Notification deliveries policies
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own notification deliveries" ON notification_deliveries
  FOR SELECT USING (
    staff_id = auth.uid()
  );

CREATE POLICY "Staff can update their own notification deliveries" ON notification_deliveries
  FOR UPDATE USING (
    staff_id = auth.uid()
  );

CREATE POLICY "System can insert notification deliveries" ON notification_deliveries
  FOR INSERT WITH CHECK (true);

-- Sync conflicts policies
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view sync conflicts for their business" ON sync_conflicts
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can create and resolve sync conflicts for their business" ON sync_conflicts
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM staff WHERE id = auth.uid()
    )
  );

-- Offline action queue policies
ALTER TABLE offline_action_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their own offline actions" ON offline_action_queue
  FOR ALL USING (
    staff_id = auth.uid()
  );

-- Create functions for automatic cleanup

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  -- Delete expired notifications and their deliveries
  DELETE FROM realtime_notifications 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  -- Delete old processed dashboard events (older than 30 days)
  DELETE FROM dashboard_events 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete old resolved sync conflicts (older than 7 days)
  DELETE FROM sync_conflicts 
  WHERE resolved_at IS NOT NULL AND resolved_at < NOW() - INTERVAL '7 days';
  
  -- Delete expired offline actions
  DELETE FROM offline_action_queue 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create default dashboard subscriptions for new staff
CREATE OR REPLACE FUNCTION create_default_dashboard_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default subscription based on staff role
  INSERT INTO staff_dashboard_subscriptions (
    staff_id,
    business_id,
    dashboard_type,
    event_types,
    notification_preferences
  ) VALUES (
    NEW.id,
    NEW.business_id,
    CASE 
      WHEN NEW.role = 'reception' THEN 'reception'
      WHEN NEW.role = 'kitchen' THEN 'kitchen'
      WHEN NEW.role = 'bar' THEN 'bar'
      WHEN NEW.role = 'accountant' THEN 'accountant'
      WHEN NEW.role = 'waiter' THEN 'reception'
      WHEN NEW.role = 'storekeeper' THEN 'kitchen'
      ELSE 'reception'
    END,
    CASE 
      WHEN NEW.role = 'reception' THEN ARRAY['order_created', 'order_updated', 'table_assigned', 'payment_processed']
      WHEN NEW.role = 'kitchen' THEN ARRAY['order_created', 'order_updated', 'inventory_changed', 'request_approved']
      WHEN NEW.role = 'bar' THEN ARRAY['order_created', 'order_updated', 'inventory_changed', 'request_approved']
      WHEN NEW.role = 'accountant' THEN ARRAY['payment_processed', 'order_completed', 'staff_activity', 'financial_alert']
      WHEN NEW.role = 'waiter' THEN ARRAY['order_created', 'order_updated', 'table_assigned']
      WHEN NEW.role = 'storekeeper' THEN ARRAY['inventory_changed', 'request_approved', 'inventory_alert']
      ELSE ARRAY['order_created', 'order_updated']
    END,
    '{
      "sound_enabled": true,
      "popup_enabled": true,
      "email_enabled": false,
      "priority_filter": "normal"
    }'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default dashboard subscriptions
DROP TRIGGER IF EXISTS create_default_dashboard_subscriptions_trigger ON staff;
CREATE TRIGGER create_default_dashboard_subscriptions_trigger
  AFTER INSERT ON staff
  FOR EACH ROW
  EXECUTE FUNCTION create_default_dashboard_subscriptions();

-- Create function to update subscription timestamp
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating subscription timestamp
DROP TRIGGER IF EXISTS update_subscription_timestamp_trigger ON staff_dashboard_subscriptions;
CREATE TRIGGER update_subscription_timestamp_trigger
  BEFORE UPDATE ON staff_dashboard_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- Add comments for documentation
COMMENT ON TABLE dashboard_events IS 'Audit trail for all dashboard events and real-time synchronization';
COMMENT ON TABLE staff_dashboard_subscriptions IS 'Staff preferences for dashboard event subscriptions';
COMMENT ON TABLE realtime_notifications IS 'Real-time notifications sent to staff dashboards';
COMMENT ON TABLE notification_deliveries IS 'Individual notification delivery tracking';
COMMENT ON TABLE sync_conflicts IS 'Data synchronization conflict resolution tracking';
COMMENT ON TABLE offline_action_queue IS 'Queue for actions performed while offline';

COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Cleanup function for expired notifications and old audit data';
COMMENT ON FUNCTION create_default_dashboard_subscriptions() IS 'Creates default dashboard subscriptions for new staff members';
COMMENT ON FUNCTION update_subscription_timestamp() IS 'Updates the updated_at timestamp for subscription changes';