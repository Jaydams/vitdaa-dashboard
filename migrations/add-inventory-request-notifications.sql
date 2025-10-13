-- Create inventory request notifications table
CREATE TABLE IF NOT EXISTS inventory_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES inventory_requests(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('status_update', 'admin_response', 'approval', 'denial')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_request_notifications_business_id ON inventory_request_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_notifications_staff_id ON inventory_request_notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_notifications_request_id ON inventory_request_notifications(request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_request_notifications_is_read ON inventory_request_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_inventory_request_notifications_created_at ON inventory_request_notifications(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE inventory_request_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for staff to see their own notifications
CREATE POLICY "Staff can view their own notifications" ON inventory_request_notifications
  FOR SELECT USING (
    staff_id = auth.uid() OR 
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
    )
  );

-- Policy for creating notifications (system/admin only)
CREATE POLICY "System can create notifications" ON inventory_request_notifications
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
    )
  );

-- Policy for updating notifications (staff can update their own)
CREATE POLICY "Staff can update their own notifications" ON inventory_request_notifications
  FOR UPDATE USING (
    staff_id = auth.uid() OR 
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
    )
  );

-- Policy for deleting notifications (staff can delete their own)
CREATE POLICY "Staff can delete their own notifications" ON inventory_request_notifications
  FOR DELETE USING (
    staff_id = auth.uid() OR 
    business_id IN (
      SELECT id FROM business_owner WHERE id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE inventory_request_notifications IS 'Notifications for inventory request status updates and admin responses';
COMMENT ON COLUMN inventory_request_notifications.notification_type IS 'Type of notification: status_update, admin_response, approval, denial';
COMMENT ON COLUMN inventory_request_notifications.title IS 'Short notification title';
COMMENT ON COLUMN inventory_request_notifications.message IS 'Detailed notification message';
COMMENT ON COLUMN inventory_request_notifications.is_read IS 'Whether the notification has been read by the staff member';

-- Create function to automatically create notifications on inventory request updates
CREATE OR REPLACE FUNCTION create_inventory_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO inventory_request_notifications (
      business_id,
      request_id,
      staff_id,
      notification_type,
      title,
      message
    ) VALUES (
      NEW.business_id,
      NEW.id,
      NEW.requested_by_staff_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'approval'
        WHEN NEW.status = 'partially_approved' THEN 'approval'
        WHEN NEW.status = 'denied' THEN 'denial'
        ELSE 'status_update'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Request Approved'
        WHEN NEW.status = 'partially_approved' THEN 'Request Partially Approved'
        WHEN NEW.status = 'denied' THEN 'Request Denied'
        ELSE 'Request Status Updated'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your inventory request has been approved'
        WHEN NEW.status = 'partially_approved' THEN 'Your inventory request has been partially approved'
        WHEN NEW.status = 'denied' THEN 'Your inventory request has been denied'
        ELSE 'Your inventory request status has been updated to ' || NEW.status
      END
    );
  END IF;

  -- Check if admin notes were added
  IF OLD.admin_notes IS NULL AND NEW.admin_notes IS NOT NULL THEN
    INSERT INTO inventory_request_notifications (
      business_id,
      request_id,
      staff_id,
      notification_type,
      title,
      message
    ) VALUES (
      NEW.business_id,
      NEW.id,
      NEW.requested_by_staff_id,
      'admin_response',
      'Admin Response Received',
      'Admin has added notes to your inventory request'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic notification creation
DROP TRIGGER IF EXISTS inventory_request_notification_trigger ON inventory_requests;
CREATE TRIGGER inventory_request_notification_trigger
  AFTER UPDATE ON inventory_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_request_notification();