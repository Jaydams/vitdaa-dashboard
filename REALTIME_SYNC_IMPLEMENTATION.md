# Real-time Synchronization Implementation

This document provides a comprehensive guide to the real-time synchronization system implemented for the staff dashboards.

## Overview

The real-time synchronization system enables seamless coordination between different staff dashboards by providing:

- **Event-driven updates** across all staff roles
- **Role-based subscriptions** for relevant data
- **Conflict resolution** for concurrent modifications
- **Offline support** with action queuing
- **Notification broadcasting** system
- **Performance optimization** with efficient queries

## Architecture

### Core Components

1. **RealTimeSyncManager** (`lib/realtime-sync-manager.ts`)

   - Manages WebSocket connections
   - Handles event broadcasting
   - Provides conflict resolution
   - Manages offline action queuing

2. **React Hooks** (`hooks/use-realtime-sync.ts`)

   - `useRealtimeSync` - Core synchronization hook
   - `useOrderSync` - Order-specific synchronization
   - `useInventorySync` - Inventory-specific synchronization
   - `useTableSync` - Table management synchronization
   - `usePaymentSync` - Payment processing synchronization
   - `useInventoryRequestSync` - Inventory request workflow

3. **Context Provider** (`components/providers/RealtimeSyncProvider.tsx`)

   - Global state management
   - Connection status monitoring
   - Notification management

4. **API Endpoints**

   - `/api/realtime/dashboard/[staffId]` - Dashboard subscriptions
   - `/api/realtime/notifications` - Notification broadcasting

5. **Notification System** (`lib/realtime-notification-service.ts`)
   - Service for managing notifications
   - Convenience methods for common notification types
   - Preference management

## Database Schema

### Tables Created

```sql
-- Dashboard events audit trail
dashboard_events (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  source_staff_id UUID,
  target_dashboards TEXT[],
  priority TEXT NOT NULL DEFAULT 'normal'
);

-- Staff dashboard subscriptions
staff_dashboard_subscriptions (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL,
  business_id UUID NOT NULL,
  dashboard_type TEXT NOT NULL,
  event_types TEXT[],
  notification_preferences JSONB,
  is_active BOOLEAN DEFAULT true
);

-- Real-time notifications
realtime_notifications (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  sender_staff_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  target_roles TEXT[],
  target_staff_ids UUID[],
  data JSONB,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Notification delivery tracking
notification_deliveries (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Sync conflict resolution
sync_conflicts (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  local_version JSONB,
  remote_version JSONB,
  resolution_strategy TEXT DEFAULT 'remote_wins'
);

-- Offline action queue
offline_action_queue (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL,
  business_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'
);
```

## Usage Guide

### Basic Setup

1. **Wrap your dashboard with the provider:**

```tsx
import { RealtimeSyncProvider } from "@/components/providers/RealtimeSyncProvider";

function StaffDashboard({ staffId, businessId, role, dashboardType }) {
  return (
    <RealtimeSyncProvider
      staffId={staffId}
      businessId={businessId}
      role={role}
      dashboardType={dashboardType}
    >
      <YourDashboardContent />
    </RealtimeSyncProvider>
  );
}
```

2. **Use hooks in your components:**

```tsx
import { useOrderSync } from "@/hooks/use-realtime-sync";

function OrderList() {
  const { orders, orderUpdates, isConnected } = useOrderSync({
    staffId: "staff-id",
    businessId: "business-id",
    role: "reception",
    dashboardType: "reception",
  });

  return (
    <div>
      <ConnectionStatus />
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
```

### Role-Based Event Subscriptions

Each staff role receives relevant events:

- **Reception**: Order creation/updates, table assignments, payments
- **Kitchen**: Order updates, inventory changes, request approvals
- **Bar**: Beverage orders, bar inventory, request approvals
- **Accountant**: All financial data, staff activity, system-wide events

### Notification Management

```tsx
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

function NotificationCenter() {
  const { notifications, unreadCount, sendNotification, markAsRead } =
    useRealtimeNotifications({
      businessId: "business-id",
      staffId: "staff-id",
    });

  const handleSendAlert = async () => {
    await sendNotification({
      type: "alert",
      title: "System Alert",
      message: "Important system notification",
      priority: "high",
      targetRoles: ["reception", "kitchen"],
    });
  };

  return (
    <div>
      <div>Unread: {unreadCount}</div>
      <button onClick={handleSendAlert}>Send Alert</button>
      <button onClick={() => markAsRead()}>Mark All Read</button>
    </div>
  );
}
```

## Event Types

### Order Events

- `order_created` - New order placed
- `order_updated` - Order status changed
- `order_completed` - Order finished

### Inventory Events

- `inventory_changed` - Stock levels updated
- `inventory_alert` - Low stock warning
- `request_approved` - Inventory request approved
- `request_denied` - Inventory request denied

### Table Events

- `table_assigned` - Table assigned to customer
- `table_updated` - Table status changed

### Payment Events

- `payment_processed` - Payment completed
- `refund_processed` - Refund issued

### System Events

- `staff_activity` - Staff action logged
- `system_alert` - System-wide notification

## Conflict Resolution

The system handles data conflicts using multiple strategies:

1. **Remote Wins** (default) - Server data takes precedence
2. **Local Wins** - Client data takes precedence
3. **Merge** - Intelligent merging of changes
4. **Manual** - User intervention required

## Offline Support

When offline, the system:

1. Queues actions locally
2. Shows offline status
3. Syncs when connection restored
4. Resolves conflicts automatically

## Performance Optimization

- **Efficient Queries**: Optimized database queries with proper indexing
- **Event Filtering**: Role-based event filtering reduces unnecessary updates
- **Connection Pooling**: Efficient WebSocket connection management
- **Caching**: Strategic caching of frequently accessed data

## Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Role-based Permissions**: Staff can only access relevant data
- **Audit Trail**: Complete logging of all events
- **Data Validation**: Input validation and sanitization

## Migration

Run the migration to set up the database:

```bash
node run_realtime_sync_migration.js
```

This will:

- Create all required tables
- Set up indexes for performance
- Configure RLS policies
- Create default subscriptions for existing staff

## Monitoring and Debugging

### Connection Status

Monitor connection status using the `ConnectionStatus` component:

```tsx
import { ConnectionStatus } from "@/components/providers/RealtimeSyncProvider";

function Dashboard() {
  return (
    <div>
      <ConnectionStatus />
      {/* Your dashboard content */}
    </div>
  );
}
```

### Event Debugging

Enable event logging in development:

```tsx
const sync = useRealtimeSync({
  // ... options
  onError: (error, context) => {
    console.error(`Sync error [${context}]:`, error);
  },
});
```

### Database Monitoring

Monitor the `dashboard_events` table for audit trails:

```sql
SELECT * FROM dashboard_events
WHERE business_id = 'your-business-id'
ORDER BY timestamp DESC
LIMIT 100;
```

## Best Practices

1. **Use Appropriate Hooks**: Choose the right hook for your use case
2. **Handle Errors**: Always provide error handlers
3. **Optimize Subscriptions**: Only subscribe to necessary events
4. **Test Offline Scenarios**: Ensure offline functionality works
5. **Monitor Performance**: Watch for excessive event generation

## Troubleshooting

### Common Issues

1. **Connection Problems**

   - Check network connectivity
   - Verify Supabase configuration
   - Check RLS policies

2. **Missing Events**

   - Verify role permissions
   - Check event type subscriptions
   - Review database triggers

3. **Performance Issues**
   - Monitor database query performance
   - Check for excessive event generation
   - Review subscription filters

### Debug Commands

```sql
-- Check active subscriptions
SELECT * FROM staff_dashboard_subscriptions WHERE staff_id = 'staff-id';

-- View recent events
SELECT * FROM dashboard_events ORDER BY timestamp DESC LIMIT 50;

-- Check notification deliveries
SELECT * FROM notification_deliveries WHERE staff_id = 'staff-id' AND is_read = false;
```

## Future Enhancements

Potential improvements:

- WebRTC for peer-to-peer communication
- Advanced conflict resolution algorithms
- Real-time collaboration features
- Enhanced mobile support
- Analytics and reporting dashboard

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the database logs
3. Monitor the connection status
4. Test with the example component

The real-time synchronization system provides a robust foundation for coordinated staff operations and can be extended as needed for additional functionality.
