# Audit Logging and Performance Monitoring System

This document describes the comprehensive audit logging and performance monitoring system implemented for the Reception Dashboard Enhancement feature.

## Overview

The system provides:

- **Audit Logging**: Comprehensive logging of all dashboard activities with timestamps and context
- **Performance Monitoring**: Real-time performance metrics collection and analysis
- **System Health Monitoring**: Continuous monitoring of system resources and network status
- **Alert System**: Automatic detection and notification of performance issues

## Components

### 1. Audit Logger (`lib/audit-logger.ts`)

The core audit logging system that tracks all reception dashboard activities.

#### Key Features:

- Order creation and modification logging
- Ticket state transition tracking
- Staff action monitoring with context
- Payment processing audit trail
- System error and recovery logging
- Performance metrics collection

#### Usage Example:

```typescript
import { createAuditLogger } from "@/lib/audit-logger";

const auditLogger = createAuditLogger(businessId, staffId, sessionId);

// Log order creation
await auditLogger.logOrderCreation({
  orderId: "order-123",
  customerName: "John Doe",
  totalAmount: 2500,
  itemCount: 3,
  staffId: "staff-456",
  staffName: "Jane Smith",
  staffRole: "receptionist",
});

// Log ticket state transition
await auditLogger.logTicketStateTransition(
  "ticket-789",
  "pending_payment",
  "completed",
  { staffId: "staff-456", staffName: "Jane Smith" }
);
```

### 2. Performance Monitoring (`hooks/usePerformanceMonitoring.ts`)

Real-time performance monitoring with automatic metrics collection.

#### Key Features:

- Operation timing and measurement
- Memory usage tracking
- Network latency monitoring
- FPS (frame rate) monitoring
- Automatic threshold checking and alerting

#### Usage Example:

```typescript
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";

const { measureOperation, systemMetrics, alerts } = usePerformanceMonitoring();

// Measure async operation
const result = await measureOperation("save_ticket", async () => {
  return await saveTicketToServer(ticketData);
});

// Check system health
if (systemMetrics?.memory.percentage > 90) {
  console.warn("High memory usage detected");
}
```

### 3. Monitoring Provider (`components/monitoring/MonitoringProvider.tsx`)

React context provider that integrates audit logging and performance monitoring.

#### Usage Example:

```typescript
import {
  MonitoringProvider,
  useMonitoring,
} from "@/components/monitoring/MonitoringProvider";

function App() {
  return (
    <MonitoringProvider
      businessId="business-123"
      staffId="staff-456"
      staffName="Jane Smith"
      staffRole="receptionist"
      enablePerformanceMonitoring={true}
    >
      <ReceptionDashboard />
    </MonitoringProvider>
  );
}

function ReceptionDashboard() {
  const { auditLogging, systemHealth } = useMonitoring();

  // Use audit logging and monitoring features
}
```

### 4. Performance Dashboard (`components/monitoring/PerformanceMonitoringDashboard.tsx`)

Visual dashboard for monitoring system performance and health.

#### Features:

- Real-time system metrics display
- Performance alerts and notifications
- Operation performance analysis
- System resource utilization charts
- Network status monitoring

## API Endpoints

### Audit Logs API (`/api/audit-logs`)

#### POST `/api/audit-logs`

Create a new audit log entry.

**Request Body:**

```json
{
  "business_id": "uuid",
  "staff_id": "uuid",
  "action": "string",
  "target_type": "string",
  "target_id": "uuid",
  "details": {},
  "reason": "string"
}
```

#### GET `/api/audit-logs`

Retrieve audit logs with filtering and pagination.

**Query Parameters:**

- `business_id` (required): Business ID
- `staff_id`: Filter by staff member
- `action`: Filter by action type
- `target_type`: Filter by target type
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `limit`: Number of records (default: 50)
- `offset`: Pagination offset (default: 0)

### Health Check API (`/api/health`)

#### GET `/api/health`

Get system health status and metrics.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "responseTime": 45,
  "database": {
    "status": "healthy",
    "latency": 12
  },
  "server": {
    "uptime": 3600,
    "memory": {},
    "version": "v18.0.0"
  }
}
```

## Integration with Order Store

The order store is enhanced with audit logging capabilities:

```typescript
import { useOrderStore } from "@/stores/order-store";
import { useAuditLogging } from "@/hooks/useAuditLogging";

function OrderComponent() {
  const { addItem, saveAsOpenTicket } = useOrderStore();
  const { logOrderCreation, logTicketOperation } = useAuditLogging({
    businessId: "business-123",
    staffId: "staff-456",
  });

  const handleAddItem = async (menuItem) => {
    // Add item to order
    addItem(menuItem);

    // Log the action
    await logOrderCreation({
      orderId: "current-order",
      itemCount: 1,
      staffId: "staff-456",
    });
  };

  const handleSaveTicket = async () => {
    const ticketId = await saveAsOpenTicket();

    // Log ticket creation
    await logTicketOperation("save", ticketId, {
      ticketNumber: "TKT-123",
      customerName: "John Doe",
      staffId: "staff-456",
    });
  };
}
```

## Automatic Monitoring Features

### 1. Order State Changes

All order modifications are automatically logged with:

- Previous and new state comparison
- Change details (items added/removed, quantity changes)
- Staff member information
- Timestamp and context

### 2. Ticket State Transitions

Ticket status changes are automatically tracked:

- Status progression (pending → preparing → ready → completed)
- Staff member who made the change
- Transition type (progression, regression, lateral)

### 3. Performance Metrics

System performance is continuously monitored:

- Memory usage with configurable thresholds
- Network latency and connectivity status
- Operation timing and error rates
- Frame rate for UI responsiveness

### 4. Error Handling and Recovery

System errors are automatically logged:

- JavaScript errors and unhandled promise rejections
- Network failures and recovery attempts
- State synchronization conflicts
- User action failures with context

## Configuration

### Performance Thresholds

```typescript
const thresholds = {
  memoryWarning: 75, // Memory usage warning at 75%
  memoryCritical: 90, // Memory usage critical at 90%
  latencyWarning: 1000, // Network latency warning at 1s
  latencyCritical: 2000, // Network latency critical at 2s
  fpsWarning: 30, // FPS warning below 30
};
```

### Audit Log Retention

- Local storage: 50 pending logs maximum
- Performance metrics: 100 recent operations
- System alerts: 10 most recent alerts

## Best Practices

### 1. Audit Logging

- Log all user actions that modify data
- Include sufficient context for troubleshooting
- Use consistent action names and target types
- Avoid logging sensitive information in details

### 2. Performance Monitoring

- Measure critical operations only
- Set appropriate thresholds for your environment
- Monitor trends, not just individual metrics
- Use performance data to optimize bottlenecks

### 3. Error Handling

- Provide graceful degradation when logging fails
- Store logs locally when server is unavailable
- Retry failed log submissions automatically
- Don't let logging failures affect user experience

## Troubleshooting

### Common Issues

#### 1. Audit Logs Not Appearing

- Check network connectivity
- Verify API endpoint is accessible
- Check browser console for errors
- Ensure business_id and staff_id are provided

#### 2. Performance Monitoring Not Working

- Verify browser supports Performance API
- Check if monitoring is enabled
- Ensure MonitoringProvider is properly configured
- Check for JavaScript errors in console

#### 3. High Memory Usage Alerts

- Clear performance metrics regularly
- Check for memory leaks in components
- Reduce the number of stored metrics
- Monitor component render cycles

### Debug Mode

Enable debug logging by setting localStorage:

```javascript
localStorage.setItem("audit_debug", "true");
```

This will log additional information to the browser console for troubleshooting.

## Security Considerations

1. **Data Encryption**: Sensitive customer data is encrypted in local storage
2. **Access Control**: Audit logs are filtered by business_id and staff permissions
3. **Rate Limiting**: API endpoints include rate limiting to prevent abuse
4. **Data Sanitization**: All input is sanitized before logging
5. **Retention Policies**: Implement appropriate data retention policies for audit logs

## Performance Impact

The monitoring system is designed to have minimal performance impact:

- Audit logging is asynchronous and non-blocking
- Performance metrics are collected efficiently
- Local storage is used as a fallback to prevent data loss
- Background processes are throttled and optimized

Expected overhead:

- Memory: < 5MB for typical usage
- CPU: < 1% additional load
- Network: Minimal (batched requests)
- Storage: < 10MB local storage
