# Vitdaa POS Notification System

This document describes the notification system implemented for the Vitdaa POS application, which provides real-time notifications for new orders, order status changes, and other business events.

## Features

### 🆕 New Order Notifications
- **Real-time alerts** when new orders are received
- **Accept/Reject functionality** directly from the notification modal
- **Order details display** including customer info, payment method, and dining option
- **Sound notifications** with toggle functionality
- **Browser notifications** for desktop alerts

### 📱 Notification Center
- **Unread count badge** on the header notification icon
- **Real-time updates** using Supabase real-time subscriptions
- **Mark as read** functionality for individual notifications
- **Mark all as read** option
- **Notification history** with proper categorization

### 🔔 Notification Types
- `new_order` - New orders received
- `order_status_change` - Order status updates
- `low_stock` - Inventory alerts
- `payment_received` - Payment confirmations
- `system_alert` - System notifications

## Database Setup

### 1. Run the Complete Setup Script (Recommended)
Execute the comprehensive setup script in your Supabase SQL editor:

```sql
-- Run this file in your Supabase SQL editor
\i scripts/setup-notification-system-robust.sql
```

### 2. If You Encounter Conflicts (Cleanup First)
If you get errors about existing objects, run the cleanup script first:

```sql
-- Run cleanup script first
\i scripts/cleanup-notification-system.sql

-- Then run the setup script
\i scripts/setup-notification-system-robust.sql
```

### 3. Alternative: Run Individual Migrations
If you prefer to run migrations individually:

```sql
-- Create notifications table
\i database/migrations/create_notifications_table.sql

-- Fix order status history RLS policies
\i database/migrations/fix_order_status_history_rls.sql

-- Enable real-time for notifications
\i database/migrations/enable_notifications_realtime.sql
```

### 2. Table Structure
The notifications table includes:
- `id` - Unique identifier
- `business_id` - Business owner reference
- `type` - Notification type
- `title` - Notification title
- `message` - Notification message
- `data` - JSON data specific to notification type
- `is_read` - Read status
- `priority` - Priority level (low, normal, high, urgent)
- `created_at` / `updated_at` - Timestamps

## Components

### NewOrderModal
**Location**: `components/notifications/NewOrderModal.tsx`

**Features**:
- Automatically appears when new orders are received
- Shows order details and customer information
- Accept/Reject buttons with status updates
- Sound notifications and browser alerts
- Queue management for multiple orders

**Usage**:
```tsx
<NewOrderModal businessId={businessId} />
```

### NotificationsBadge
**Location**: `components/shared/header/NotificationsBadge.tsx`

**Features**:
- Displays unread notification count
- Real-time updates via Supabase subscriptions
- Animated badge with count overflow handling

### NotificationContent
**Location**: `components/shared/header/NotificationContent.tsx`

**Features**:
- Lists all notifications
- Real-time updates
- Mark all as read functionality
- Proper error handling and loading states

### NotificationItem
**Location**: `components/shared/header/NotificationItem.tsx`

**Features**:
- Individual notification display
- Type-specific icons and styling
- Order action buttons for new orders
- Click to mark as read functionality

## Server Actions

### Notification Actions
**Location**: `actions/notification-actions.ts`

**Available Functions**:
- `createNotification()` - Create new notification
- `fetchNotifications()` - Fetch notifications with filters
- `getUnreadNotificationCount()` - Get count of unread notifications
- `markNotificationAsRead()` - Mark single notification as read
- `markAllNotificationsAsRead()` - Mark all notifications as read
- `deleteNotification()` - Delete notification
- `createOrderNotification()` - Create order-specific notification
- `createOrderStatusChangeNotification()` - Create status change notification

### Order Actions Integration
**Location**: `actions/order-actions.ts`

**Updates**:
- Automatically creates notifications when order status changes
- Integrates with existing order management workflow

## Real-time Features

### Supabase Subscriptions
The system uses Supabase real-time subscriptions for:
- New order notifications
- Order status changes
- Notification updates
- Badge count updates

### Channels
- `new-order-modal-{businessId}` - New order modal updates
- `notification-badge` - Badge count updates
- `notification-orders` - Order-related notifications
- `notification-{businessId}` - General notification updates

## Configuration

### Environment Variables
Ensure your Supabase configuration is properly set up in your environment variables.

### Sound Settings
Users can toggle notification sounds on/off using the volume button in the New Order Modal.

### Browser Notifications
The system requests browser notification permissions and shows desktop alerts for new orders.

## Testing

### Test API Endpoint
Use the test endpoint to create sample notifications:

```bash
POST /api/notifications/test
{
  "type": "system_alert",
  "title": "Test Notification",
  "message": "This is a test notification",
  "data": {}
}
```

### Manual Testing
1. Create a new order in the system
2. Verify the New Order Modal appears
3. Check notification badge count increases
4. Open notification center and verify new notification appears
5. Test Accept/Reject functionality
6. Verify notification is marked as read

## Troubleshooting

### Common Issues

1. **"await is not defined" error in NewOrderModal**
   - **Cause**: The `createOrderNotification` function is being called with `await` in a Supabase real-time callback
   - **Solution**: The code has been updated to use `.catch()` instead of `await` in real-time callbacks
   - **Prevention**: Always use `.catch()` for async operations in real-time callbacks

2. **"Failed to update order status" error**
   - **Cause**: RLS (Row Level Security) policies on `order_status_history` table are too restrictive
   - **Solution**: Run the RLS fix migration: `\i database/migrations/fix_order_status_history_rls.sql`
   - **Alternative**: Use the comprehensive setup script: `\i scripts/setup-notification-system.sql`

3. **Notifications not appearing**
   - Check Supabase real-time subscriptions
   - Verify database permissions and RLS policies
   - Check browser console for errors
   - Ensure notifications table is added to real-time publication

4. **Badge count not updating**
   - Verify notification creation in database
   - Check real-time subscription channels
   - Refresh the page to test
   - Ensure notifications table has real-time enabled

5. **Sound not playing**
   - Check browser audio permissions
   - Verify sound toggle state
   - Check browser console for AudioContext errors

6. **Real-time subscriptions not working**
   - Verify the notifications table is in the `supabase_realtime` publication
   - Check that RLS policies allow proper access
   - Ensure the table has real-time enabled via `add_table_to_realtime_if_not_exists()`

### Debug Information
Enable console logging to see:
- Real-time subscription events
- Notification creation/updates
- Order status changes
- Error messages

## Future Enhancements

### Planned Features
- **Push notifications** for mobile devices
- **Email notifications** for important alerts
- **Custom notification preferences** per user
- **Notification scheduling** for reminders
- **Advanced filtering** and search
- **Notification templates** for different business types

### Integration Opportunities
- **Slack/Discord** webhook integration
- **SMS notifications** for urgent alerts
- **Customer notification system** for order updates
- **Staff assignment notifications** for order management

## Support

For issues or questions about the notification system:
1. Check the console logs for error messages
2. Verify database setup and permissions
3. Test with the provided test endpoints
4. Review Supabase real-time documentation

## Dependencies

- **Supabase** - Database and real-time subscriptions
- **React Query** - Data fetching and caching
- **Lucide React** - Icons
- **Tailwind CSS** - Styling
- **Next.js** - Framework and API routes
