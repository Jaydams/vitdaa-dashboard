# Error Recovery System Implementation

## Overview

The Error Recovery System provides comprehensive error handling, offline support, and session management for the Vitdaa POS staff dashboards. It ensures that staff can continue working even when network issues occur and provides graceful recovery mechanisms for various error scenarios.

## Features

### 1. Comprehensive Error Recovery

- **Automatic Error Detection**: Catches and analyzes errors across all dashboard components
- **Intelligent Recovery**: Provides context-aware recovery strategies based on error type
- **Fallback Options**: Multiple recovery paths for different error scenarios
- **User-Friendly Messages**: Clear, actionable error messages for staff

### 2. Offline Support

- **Action Queuing**: Automatically queues actions when offline
- **Smart Synchronization**: Syncs queued actions when connection is restored
- **Conflict Resolution**: Handles data conflicts intelligently
- **Priority Management**: Processes critical actions first

### 3. Session Management

- **Graceful Expiration**: Handles session expiration without losing work
- **Automatic Re-authentication**: Attempts to refresh sessions automatically
- **Work Preservation**: Saves work in progress across session changes
- **Conflict Resolution**: Manages concurrent sessions and device switches

### 4. Dashboard-Specific Error Boundaries

- **Reception Dashboard**: Handles order creation and customer management errors
- **Kitchen Dashboard**: Manages order processing and inventory request errors
- **Bar Dashboard**: Handles beverage order and inventory errors
- **Accountant Dashboard**: Manages financial reporting and transaction errors

## Architecture

### Core Components

1. **ErrorRecoveryService** (`lib/error-recovery-service.ts`)

   - Central error recovery logic
   - Fallback strategy management
   - Recovery result tracking

2. **OfflineManager** (`lib/offline-manager.ts`)

   - Action queuing and synchronization
   - Network status monitoring
   - Conflict resolution

3. **SessionManager** (`lib/session-manager.ts`)

   - Session lifecycle management
   - Work in progress preservation
   - Authentication handling

4. **Error Boundaries** (`components/error-boundary/`)

   - Dashboard-specific error catching
   - Automatic recovery attempts
   - User-friendly error displays

5. **ErrorRecoveryProvider** (`components/providers/ErrorRecoveryProvider.tsx`)
   - React context for error recovery
   - Service integration
   - Global error handling

## Implementation Guide

### 1. Basic Setup

Wrap your application with the ErrorRecoveryProvider:

```tsx
import { ErrorRecoveryProvider } from "@/components/providers/ErrorRecoveryProvider";

function App() {
  return (
    <ErrorRecoveryProvider
      enableAutoRecovery={true}
      enableSessionManagement={true}
      enableOfflineSupport={true}
    >
      <YourDashboardComponents />
    </ErrorRecoveryProvider>
  );
}
```

### 2. Dashboard Error Boundaries

Wrap each dashboard with its specific error boundary:

```tsx
import { ReceptionDashboardErrorBoundary } from "@/components/error-boundary/ReceptionDashboardErrorBoundary";

function ReceptionDashboard() {
  return (
    <ReceptionDashboardErrorBoundary>
      <ReceptionDashboardContent />
    </ReceptionDashboardErrorBoundary>
  );
}
```

### 3. Component-Level Error Handling

Use the error recovery hook in components:

```tsx
import { useComponentErrorRecovery } from "@/components/providers/ErrorRecoveryProvider";

function OrderCreationForm() {
  const { handleError, saveWork } =
    useComponentErrorRecovery("OrderCreationForm");

  const handleSubmit = async (orderData) => {
    try {
      await createOrder(orderData);
    } catch (error) {
      const result = await handleError(error, "create_order", { orderData });
      if (!result.success) {
        // Handle failed recovery
      }
    }
  };

  // Save work in progress
  useEffect(() => {
    saveWork(formData);
  }, [formData, saveWork]);
}
```

### 4. Offline Action Queuing

Queue actions for offline execution:

```tsx
import { useErrorRecoveryContext } from "@/components/providers/ErrorRecoveryProvider";

function InventoryUpdate() {
  const { queueAction, isOnline } = useErrorRecoveryContext();

  const updateInventory = async (itemId, quantity) => {
    if (!isOnline) {
      // Queue for later execution
      queueAction("update_inventory", { itemId, quantity }, "normal");
      toast.info("Action queued for when online");
      return;
    }

    // Execute immediately if online
    await fetch(`/api/inventory/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  };
}
```

### 5. Session Management

Handle session expiration gracefully:

```tsx
import { useSessionManager } from "@/lib/session-manager";

function DashboardHeader() {
  const { session, timeUntilExpiry, extendSession } = useSessionManager();

  // Show warning when session is about to expire
  if (timeUntilExpiry < 5 * 60 * 1000) {
    // 5 minutes
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-3">
        <p>Session expires in {Math.floor(timeUntilExpiry / 60000)} minutes</p>
        <button onClick={() => extendSession(30)}>Extend Session</button>
      </div>
    );
  }
}
```

## Error Types and Recovery Strategies

### Network Errors

- **Detection**: Connection timeouts, fetch failures
- **Recovery**: Queue actions offline, retry when online
- **Fallback**: Manual mode, cached data

### Permission Errors

- **Detection**: 401/403 responses, auth failures
- **Recovery**: Automatic re-authentication
- **Fallback**: Redirect to login, clear cached auth

### Validation Errors

- **Detection**: 400 responses, form validation failures
- **Recovery**: Show validation messages
- **Fallback**: Reset form, provide examples

### Session Errors

- **Detection**: Session expiration, concurrent logins
- **Recovery**: Automatic session refresh
- **Fallback**: Save work, redirect to login

### System Errors

- **Detection**: 500 responses, unexpected failures
- **Recovery**: Retry with backoff
- **Fallback**: Refresh page, contact support

## Configuration Options

### ErrorRecoveryProvider Props

```tsx
interface ErrorRecoveryProviderProps {
  enableAutoRecovery?: boolean; // Enable automatic error recovery
  enableSessionManagement?: boolean; // Enable session management
  enableOfflineSupport?: boolean; // Enable offline action queuing
  onSessionConflict?: (conflict) => void; // Handle session conflicts
  onCriticalError?: (error, context) => void; // Handle critical errors
}
```

### OfflineManager Configuration

```tsx
const offlineConfig = {
  maxQueueSize: 100, // Maximum queued actions
  maxRetries: 3, // Maximum retry attempts
  retryDelay: 5000, // Delay between retries (ms)
  persistToStorage: true, // Persist queue to localStorage
  autoSync: true, // Auto-sync when online
};
```

### SessionManager Configuration

```tsx
const sessionConfig = {
  preserveWorkInProgress: true, // Save work across sessions
  autoReauthenticate: true, // Attempt automatic re-auth
  conflictResolution: "ask_user", // How to handle conflicts
};
```

## Monitoring and Debugging

### Error Recovery Dashboard

Access the error recovery dashboard to monitor system status:

```tsx
import { ErrorRecoveryDashboard } from "@/components/dashboard/ErrorRecoveryDashboard";

function AdminPanel() {
  return (
    <div>
      <h1>System Status</h1>
      <ErrorRecoveryDashboard />
    </div>
  );
}
```

### Status Indicators

Show system status in the header:

```tsx
import { ErrorRecoveryIndicator } from "@/components/ui/error-recovery-panel";

function Header() {
  return (
    <header>
      <h1>Dashboard</h1>
      <ErrorRecoveryIndicator />
    </header>
  );
}
```

### Development Tools

In development mode, error boundaries show detailed error information:

- Component stack traces
- Error context and metadata
- Recovery attempt results
- Network status and pending actions

## Best Practices

### 1. Error Boundary Placement

- Place error boundaries at dashboard level
- Use specific boundaries for critical components
- Provide meaningful context names

### 2. Work Preservation

- Save form data frequently
- Use meaningful keys for work storage
- Clean up saved work after successful operations

### 3. User Communication

- Show clear, actionable error messages
- Indicate when actions are queued offline
- Provide progress feedback for recovery attempts

### 4. Testing Error Scenarios

- Test offline functionality
- Simulate network failures
- Test session expiration scenarios
- Verify error boundary behavior

### 5. Performance Considerations

- Limit queue size to prevent memory issues
- Use debouncing for frequent actions
- Clean up old queued actions
- Monitor error recovery performance

## API Integration

### Required API Endpoints

The error recovery system expects these endpoints:

```typescript
// Session management
POST / api / staff / sessions / extend;
POST / api / staff / sessions / end;
POST / api / staff / sessions / { staffId } / check;
POST / api / staff / auth / refresh;

// Action execution (for offline sync)
POST / api / orders;
PUT / api / orders / { id } / status;
PUT / api / inventory / items / { id };
POST / api / inventory / requests;
POST / api / payments;
PUT / api / tables / { id } / assign;
```

### Error Response Format

APIs should return consistent error responses:

```json
{
  "error": {
    "type": "validation|permission|network|system",
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "validation details"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Actions not syncing**

   - Check network connectivity
   - Verify API endpoints are accessible
   - Check browser console for errors

2. **Session not extending**

   - Verify session extension API endpoint
   - Check authentication headers
   - Ensure session is still valid

3. **Work not preserved**

   - Check localStorage availability
   - Verify work saving is enabled
   - Check for storage quota limits

4. **Error boundaries not catching errors**
   - Ensure boundaries are properly placed
   - Check for async errors (use try/catch)
   - Verify error boundary implementation

### Debug Mode

Enable debug mode for detailed logging:

```tsx
<ErrorRecoveryProvider
  enableAutoRecovery={true}
  onCriticalError={(error, context) => {
    console.log("Critical error:", error, context);
    // Send to monitoring service
  }}
>
```

## Migration Guide

### From Existing Error Handling

1. **Replace try/catch blocks** with error recovery hooks
2. **Add error boundaries** around dashboard components
3. **Implement offline queuing** for critical actions
4. **Add session management** to existing auth system

### Gradual Implementation

1. Start with error boundaries on main dashboards
2. Add offline support for critical operations
3. Implement session management
4. Add comprehensive error recovery

## Performance Impact

### Memory Usage

- Offline queue: ~1KB per queued action
- Session data: ~2KB per session
- Error logs: ~500B per error

### Network Impact

- Automatic retries use exponential backoff
- Session extension: 1 request per 30 minutes
- Sync operations: Batched when possible

### Storage Usage

- localStorage: Queue and session data
- sessionStorage: Temporary work data
- IndexedDB: Large offline datasets (future)

## Security Considerations

### Data Protection

- Sensitive data is not stored in offline queue
- Session tokens are encrypted in storage
- Work in progress excludes sensitive fields

### Authentication

- Automatic re-authentication uses secure tokens
- Session conflicts are resolved securely
- Failed auth attempts are logged

### Network Security

- All API calls use HTTPS
- Retry logic respects rate limits
- Error messages don't expose sensitive data

## Future Enhancements

### Planned Features

- Advanced conflict resolution UI
- Offline data synchronization
- Error analytics and reporting
- Performance monitoring integration
- Mobile-specific optimizations

### Extensibility

- Custom error recovery strategies
- Plugin system for additional services
- Configurable retry policies
- Custom storage backends

## Session Management Enhancements (Task 10.2)

### Enhanced Session Features

#### 1. Session Conflict Resolution

- **Automatic Detection**: Detects concurrent logins, device switches, and expired sessions
- **User-Friendly Dialog**: Interactive conflict resolution with clear options
- **Smart Resolution**: Takeover, merge, or cancel options based on conflict type
- **Work Preservation**: Maintains work-in-progress during conflicts

#### 2. Session Expiry Management

- **Progressive Warnings**: 15-minute, 5-minute, and 1-minute warnings
- **Auto-Extension**: One-click session extension (30 min, 1 hour)
- **Visual Indicators**: Progress bars and status badges
- **Critical Alerts**: Urgent notifications for imminent expiry

#### 3. Automatic Re-authentication

- **Multiple Methods**: Refresh tokens, stored credentials, biometric, SSO
- **Retry Logic**: Exponential backoff with configurable attempts
- **Seamless Experience**: Background re-auth without user interruption
- **Fallback Handling**: Graceful degradation when auto-reauth fails

#### 4. Work-in-Progress Preservation

- **Automatic Saving**: Real-time form data and component state preservation
- **Priority Levels**: Critical, high, normal, low priority work items
- **Component-Level**: Granular work preservation per dashboard component
- **Cross-Device**: State transfer between devices during session switches

#### 5. Session State Management

- **Complete Snapshots**: Full session state including forms, navigation, UI state
- **Export/Import**: Save and restore session states as JSON files
- **Device Synchronization**: Seamless state transfer between devices
- **Temporal Data**: Automatic cleanup of old state data

### New Components Created

#### Session Management UI Components

1. **SessionConflictDialog** - Interactive conflict resolution
2. **SessionExpiryWarning** - Progressive expiry warnings
3. **SessionManagementDashboard** - Comprehensive session monitoring
4. **SessionExpiryNotification** - Floating expiry alerts

#### Core Services

1. **SessionStateManager** - Advanced state preservation and restoration
2. **AutoReauthService** - Automatic re-authentication with multiple methods
3. **Enhanced SessionManager** - Extended with conflict resolution and device management

#### Integration Examples

1. **SessionManagementIntegrationExample** - Complete implementation guide
2. **WorkInProgressExample** - Automatic work preservation demo
3. **AutoReauthExample** - Background re-authentication demo
4. **SessionConflictExample** - Conflict resolution demo
5. **StateSnapshotExample** - State management demo

### Key Features Implemented

#### Graceful Session Expiration Handling

- **Progressive Warnings**: 15, 10, 5, and 1-minute warnings before expiry
- **Auto-Extension Options**: Quick 30-minute or 1-hour extensions
- **Work Preservation**: Automatic saving of all form data and component states
- **Visual Feedback**: Progress bars, badges, and color-coded status indicators

#### Automatic Re-authentication Without Losing Work

- **Background Processing**: Re-auth attempts happen transparently
- **Multiple Strategies**: Refresh tokens, stored credentials, biometric auth
- **Retry Logic**: Up to 3 attempts with exponential backoff
- **Work Continuity**: All work-in-progress is preserved during re-auth

#### Session State Preservation Across Device Switches

- **Complete State Capture**: Forms, navigation, UI state, temporary data
- **Device Transfer**: Seamless state migration between devices
- **Conflict Resolution**: Smart handling of concurrent sessions
- **Data Integrity**: Ensures no work is lost during device switches

#### Session Conflict Resolution

- **Conflict Types**: Device switch, concurrent login, expired session detection
- **Resolution Options**: Takeover (end other session), merge (combine work), cancel
- **User Choice**: Interactive dialog with clear explanations
- **Work Merging**: Intelligent combination of work from multiple sessions

### Enhanced Error Recovery Integration

The session management enhancements are fully integrated with the error recovery system:

#### Unified Context Provider

```tsx
<ErrorRecoveryProvider
  enableSessionManagement={true}
  onSessionConflict={(conflict) => {
    // Handle session conflicts
  }}
>
  <YourDashboardComponents />
</ErrorRecoveryProvider>
```

#### Enhanced Context API

```tsx
const {
  // Session Management
  session,
  timeUntilExpiry,
  isSessionValid,
  extendSession,

  // Enhanced Features
  isReauthenticating,
  saveComponentWork,
  getComponentWork,
  createStateSnapshot,
  restoreStateSnapshot,
} = useErrorRecoveryContext();
```

#### Automatic Integration

- **Error Boundaries**: Session errors are caught and handled gracefully
- **Offline Support**: Session actions are queued when offline
- **Recovery Strategies**: Session-specific fallback options
- **Monitoring**: Real-time session health monitoring

### Configuration Options

#### Session Management Configuration

```tsx
const sessionConfig = {
  preserveWorkInProgress: true, // Save work across sessions
  autoReauthenticate: true, // Attempt automatic re-auth
  conflictResolution: "ask_user", // How to handle conflicts
  warningThreshold: 10, // Minutes before showing warnings
  criticalThreshold: 2, // Minutes before critical alerts
};
```

#### Auto-Reauth Configuration

```tsx
const reauthConfig = {
  enableAutoReauth: true,
  maxAttempts: 3,
  attemptInterval: 5000,
  methods: ["refresh_token", "stored_credentials"],
  preserveWorkOnFailure: true,
  notifyUser: true,
};
```

### Usage Examples

#### Basic Session Management

```tsx
function DashboardComponent() {
  const { session, timeUntilExpiry, extendSession } = useErrorRecoveryContext();

  // Show session warning
  if (timeUntilExpiry < 5 * 60 * 1000) {
    return <SessionExpiryWarning />;
  }

  return <YourDashboardContent />;
}
```

#### Work-in-Progress Preservation

```tsx
function OrderForm() {
  const { saveComponentWork, getComponentWork } = useErrorRecoveryContext();
  const [formData, setFormData] = useState({});

  // Auto-save work
  useEffect(() => {
    saveComponentWork("OrderForm", formData, { priority: "high" });
  }, [formData]);

  // Restore work on mount
  useEffect(() => {
    const savedWork = getComponentWork("OrderForm");
    if (savedWork.length > 0) {
      setFormData(savedWork[0].data);
    }
  }, []);
}
```

#### Session Conflict Handling

```tsx
function App() {
  const { conflict, showConflict, hideConflict } = useSessionConflictDialog();

  return (
    <ErrorRecoveryProvider onSessionConflict={showConflict}>
      <YourApp />
      <SessionConflictDialog
        conflict={conflict}
        onResolve={(resolution) => {
          // Handle resolution
        }}
        onClose={hideConflict}
      />
    </ErrorRecoveryProvider>
  );
}
```

### Benefits

#### For Staff Users

- **Uninterrupted Work**: Never lose work due to session issues
- **Seamless Experience**: Automatic handling of session problems
- **Device Flexibility**: Switch between devices without losing progress
- **Clear Communication**: Always know session status and time remaining

#### For System Administrators

- **Reduced Support**: Fewer session-related support tickets
- **Better Monitoring**: Comprehensive session health visibility
- **Flexible Configuration**: Customizable session policies
- **Audit Trail**: Complete session activity logging

#### For Business Operations

- **Improved Productivity**: Staff can work without session interruptions
- **Data Integrity**: No lost orders or work due to session issues
- **Operational Continuity**: Business operations continue smoothly
- **Cost Reduction**: Less time spent on session-related issues

The enhanced session management system provides enterprise-grade session handling with automatic recovery, work preservation, and seamless user experience across all staff dashboards.
