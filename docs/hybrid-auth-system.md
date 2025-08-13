# Hybrid Authentication System Documentation

## Overview

The Hybrid Authentication System is a comprehensive four-layer security architecture designed for restaurant management systems. It provides hierarchical access control where admin authentication enables staff access through controlled, supervised session management.

## Core Concept

Think of it as a "master key" system where the admin's login unlocks the ability for staff to use their individual "room keys" (PINs). This ensures complete administrative oversight while maintaining simplicity for daily operations.

## System Architecture

### Four-Layer Authentication Structure

#### Layer 1: Admin Authentication (Supabase Auth)
- **Technology**: Full Supabase authentication with email/password
- **Session Management**: Secure admin sessions tied to specific restaurants
- **Requirement**: Admin session must be active for any staff access
- **Security**: Row Level Security (RLS) policies enforce business isolation

#### Layer 2: Shift Control (Time-bound Permission Gate)
- **Purpose**: Acts as a time-bound permission gate for staff access
- **Control**: Only during active shifts can staff login
- **Alignment**: Provides business operation alignment (no after-hours access)
- **Management**: Admin can start/end shifts with configurable parameters

#### Layer 3: Staff PIN Authentication
- **Simplicity**: Staff use simple 4-6 digit PIN codes
- **Dependency**: PIN only works during active shifts
- **Security**: Creates temporary staff session tokens with expiration
- **Method**: No direct database authentication - just session management

#### Layer 4: Session Management
- **Tracking**: Both admin and staff sessions are tracked separately
- **Hierarchy**: Staff sessions are dependent on admin sessions
- **Cleanup**: Automatic cleanup when admin logs out or shift ends
- **Monitoring**: Real-time session monitoring and analytics

## Database Schema

### Core Tables

```sql
-- Admin Sessions (Layer 1)
admin_sessions
├── id (UUID, Primary Key)
├── admin_id (UUID, References auth.users)
├── business_id (UUID, References businesses)
├── session_token (TEXT, Unique)
├── created_at (TIMESTAMPTZ)
├── last_activity (TIMESTAMPTZ)
├── ip_address (INET)
├── user_agent (TEXT)
└── is_active (BOOLEAN)

-- Restaurant Shifts (Layer 2)
restaurant_shifts
├── id (UUID, Primary Key)
├── business_id (UUID, References businesses)
├── admin_id (UUID, References auth.users)
├── shift_name (TEXT)
├── started_at (TIMESTAMPTZ)
├── ended_at (TIMESTAMPTZ)
├── is_active (BOOLEAN)
├── max_staff_sessions (INTEGER)
├── auto_end_time (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)

-- Staff Sessions (Layer 3 & 4)
staff_sessions
├── id (UUID, Primary Key)
├── staff_id (UUID, References staff)
├── business_id (UUID, References businesses)
├── shift_id (UUID, References restaurant_shifts)
├── session_token (TEXT, Unique)
├── pin_hash (TEXT)
├── created_at (TIMESTAMPTZ)
├── last_activity (TIMESTAMPTZ)
├── expires_at (TIMESTAMPTZ)
├── ip_address (INET)
├── device_info (JSONB)
└── is_active (BOOLEAN)

-- Audit Logs (Security & Compliance)
audit_logs
├── id (UUID, Primary Key)
├── admin_id (UUID, References auth.users)
├── staff_id (UUID, References staff)
├── business_id (UUID, References businesses)
├── action (TEXT)
├── target_type (TEXT)
├── target_id (UUID)
├── details (JSONB)
├── reason (TEXT)
├── ip_address (INET)
├── user_agent (TEXT)
└── created_at (TIMESTAMPTZ)
```

### Enhanced Staff Table

```sql
-- Additional columns added to existing staff table
ALTER TABLE staff ADD COLUMN:
├── pin_hash (TEXT) -- SHA-256 hash of staff PIN
├── failed_login_attempts (INTEGER DEFAULT 0)
├── locked_until (TIMESTAMPTZ) -- Account lockout timestamp
├── last_login (TIMESTAMPTZ)
└── login_count (INTEGER DEFAULT 0)
```

## Authentication Flows

### Admin Workflow

1. **Admin Login** → Supabase auth creates admin session
2. **Start Shift** → Enables staff login capability for restaurant
3. **Monitor Staff** → Can see who's logged in, end sessions
4. **End Shift** → Automatically logs out all staff
5. **Admin Logout** → Can optionally auto-end shift and staff sessions

### Staff Workflow

1. **Check Shift Status** → System verifies active shift exists
2. **PIN Entry** → Staff enters their PIN
3. **Session Creation** → Temporary session token generated
4. **Dashboard Access** → Role-based access to specific features
5. **Auto-Logout** → Session expires or admin ends shift

## Security Architecture

### Multi-Level Security Gates

#### Gate 1: Admin Verification
- Must have valid Supabase admin session
- Admin must be authorized for specific restaurant
- Uses Supabase Row Level Security (RLS)

#### Gate 2: Shift Verification
- Active shift must exist for restaurant
- Shift hasn't expired or been manually ended
- Prevents after-hours access

#### Gate 3: Staff Authentication
- Valid PIN for specific staff member
- Staff account must be active (not disabled)
- PIN lockout after failed attempts (5 attempts = 30-minute lock)

#### Gate 4: Session Validation
- Session token must be valid and not expired
- Session must be tied to current active shift
- Regular session refresh required

## API Endpoints

### Admin Authentication
```typescript
POST /api/auth/hybrid/admin/login
POST /api/auth/hybrid/admin/logout
```

### Shift Management
```typescript
POST /api/auth/hybrid/shifts/start
POST /api/auth/hybrid/shifts/end
GET  /api/auth/hybrid/shifts/status
```

### Staff Authentication
```typescript
POST /api/auth/hybrid/staff/login
POST /api/auth/hybrid/staff/logout
```

### Session Management
```typescript
GET /api/auth/hybrid/sessions/active
```

## React Components

### Admin Components
- `HybridAdminLogin` - Admin authentication interface
- `HybridAuthDashboard` - Complete admin dashboard
- `HybridShiftManager` - Shift control interface

### Staff Components
- `HybridStaffLogin` - Staff PIN entry interface

### Utility Components
- `HybridAuthMiddleware` - Route protection middleware

## Usage Examples

### Admin Login Flow

```typescript
import HybridAdminLogin from '@/components/auth/HybridAdminLogin';

function AdminLoginPage() {
  const handleLoginSuccess = (sessionData) => {
    // Store session and redirect to dashboard
    localStorage.setItem('hybrid_admin_session', JSON.stringify(sessionData.session));
    router.push('/admin/dashboard');
  };

  return (
    <HybridAdminLogin
      businessId="business-123"
      businessName="Restaurant Name"
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
```

### Staff Login Flow

```typescript
import HybridStaffLogin from '@/components/auth/HybridStaffLogin';

function StaffLoginPage() {
  const handleLoginSuccess = (sessionData) => {
    // Store session and redirect to staff dashboard
    localStorage.setItem('hybrid_staff_session', JSON.stringify(sessionData.session));
    router.push('/staff/dashboard');
  };

  return (
    <HybridStaffLogin
      businessId="business-123"
      businessName="Restaurant Name"
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
```

### Protected API Route

```typescript
import { withHybridAuth } from '@/lib/hybrid-auth-middleware';

export const GET = withHybridAuth(
  async (request, authContext) => {
    // Route logic here - authContext contains user info
    return NextResponse.json({ 
      user: authContext.type,
      permissions: authContext.permissions 
    });
  },
  { requireAdmin: true } // Only admins can access
);
```

### Shift Management

```typescript
import HybridShiftManager from '@/components/auth/HybridShiftManager';

function AdminDashboard() {
  return (
    <HybridShiftManager
      adminSessionToken={sessionToken}
      businessId={businessId}
      businessName={businessName}
      onShiftChange={(shiftStatus) => {
        console.log('Shift status changed:', shiftStatus);
      }}
    />
  );
}
```

## Security Features

### PIN Security
- SHA-256 hashing for PIN storage
- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Rate limiting on PIN attempts

### Session Security
- Token rotation and expiration
- Device binding and IP tracking
- Concurrent session limits
- Anomaly detection for unusual patterns

### Audit Trail
- Complete activity logging
- Failed login tracking
- Session duration reports
- Compliance reporting capabilities

## Operational Workflows

### Daily Operations Flow

1. **Opening**: Admin arrives, logs in, starts shift
2. **Staff Arrival**: Staff members PIN in as they arrive
3. **Shift Changes**: Admin can start new shift, transferring control
4. **Break Management**: Staff can logout/login during breaks
5. **Closing**: Admin ends shift, automatically logging out all staff

### Emergency Scenarios

1. **Admin Emergency Logout**: All staff immediately lose access
2. **Staff Account Compromise**: Admin can disable individual staff
3. **System Maintenance**: Emergency shift end with notification
4. **Network Issues**: Graceful degradation with local session caching

## Monitoring & Compliance

### Real-time Monitoring
- Active session tracking
- Live staff activity monitoring
- System health indicators
- Security alert notifications

### Audit Capabilities
- Complete activity logs (who accessed what, when)
- Failed login tracking for security incidents
- Session duration reports for productivity insights
- Compliance reporting for regulatory requirements

### Administrative Controls
- Bulk staff management (enable/disable multiple staff)
- Emergency lockout (immediate access revocation)
- Shift scheduling (pre-planned shift activation)
- Permission templates (quick role assignment)

## Performance Considerations

### Optimization Features
- Session caching with Redis/memory cache
- Database indexing for optimized session queries
- Background jobs for expired session cleanup
- API rate limiting to prevent brute force attacks

### Scalability
- Multi-restaurant support with isolated operations
- Horizontal scaling capabilities
- Efficient database queries with proper indexing
- Configurable session limits and timeouts

## Configuration

### Environment Variables
```env
# Session Configuration
HYBRID_AUTH_SESSION_DURATION=43200000  # 12 hours in milliseconds
HYBRID_AUTH_ADMIN_SESSION_DURATION=86400000  # 24 hours in milliseconds
HYBRID_AUTH_MAX_FAILED_ATTEMPTS=5
HYBRID_AUTH_LOCKOUT_DURATION=1800000  # 30 minutes in milliseconds

# Security Configuration
HYBRID_AUTH_ENABLE_IP_TRACKING=true
HYBRID_AUTH_ENABLE_DEVICE_BINDING=true
HYBRID_AUTH_MAX_CONCURRENT_SESSIONS=3

# Cleanup Configuration
HYBRID_AUTH_CLEANUP_INTERVAL=900000  # 15 minutes in milliseconds
HYBRID_AUTH_SESSION_CLEANUP_ENABLED=true
```

### Database Functions
The system includes several PostgreSQL functions for maintenance:

- `end_expired_shifts()` - Automatically end expired shifts
- `cleanup_expired_sessions()` - Clean up expired sessions
- `get_active_session_count()` - Get session statistics

## Testing

### Test Coverage
- Unit tests for all authentication managers
- Integration tests for complete authentication flows
- API endpoint testing with various scenarios
- Security testing for edge cases and attack vectors

### Running Tests
```bash
npm test -- __tests__/hybrid-auth-system.test.ts --run
```

## Troubleshooting

### Common Issues

#### Staff Cannot Login
1. Check if shift is active
2. Verify staff account is not disabled
3. Check if staff capacity is reached
4. Verify PIN is correct and account not locked

#### Admin Session Issues
1. Check Supabase authentication status
2. Verify business ownership permissions
3. Check session expiration
4. Verify network connectivity

#### Shift Management Problems
1. Check admin session validity
2. Verify business permissions
3. Check for conflicting active shifts
4. Review shift configuration parameters

### Debug Mode
Enable debug logging by setting:
```env
HYBRID_AUTH_DEBUG=true
```

## Migration Guide

### From Basic Authentication
1. Run the database migration script
2. Update existing staff records with PIN hashes
3. Implement new authentication components
4. Update API routes with hybrid auth middleware
5. Test thoroughly in staging environment

### Database Migration
```sql
-- Run the migration script
\i supabase/migrations/20241204000000_hybrid_auth_system.sql
```

## Best Practices

### Security
- Regularly rotate session tokens
- Monitor failed login attempts
- Implement proper session cleanup
- Use HTTPS for all authentication endpoints
- Regular security audits and penetration testing

### Performance
- Implement session caching
- Use database connection pooling
- Monitor session cleanup performance
- Optimize database queries with proper indexing

### User Experience
- Provide clear error messages
- Implement loading states
- Use optimistic updates where appropriate
- Ensure mobile-friendly interfaces

## Support

For issues or questions regarding the Hybrid Authentication System:

1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Examine the API endpoint implementations
4. Check the database schema and constraints

## Changelog

### Version 1.0.0
- Initial implementation of four-layer authentication
- Complete admin and staff authentication flows
- Shift management system
- Session monitoring and analytics
- Comprehensive security features
- Full test coverage
- Documentation and examples