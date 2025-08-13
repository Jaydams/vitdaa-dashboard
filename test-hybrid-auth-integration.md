# Hybrid Authentication Integration Test

## Test Checklist

### ✅ 1. Regular Staff Login (Existing System)

- [ ] Navigate to `/staff/login`
- [ ] Should see "Enter your PIN and Business ID" message
- [ ] Form should have PIN and Business ID fields
- [ ] Should work with existing staff login action

### ✅ 2. Hybrid Staff Login (New System)

- [ ] Navigate to `/staff/login?businessId=test-id&adminToken=test-token`
- [ ] Should see "Enter your Staff ID and PIN" message
- [ ] Should show shift status section
- [ ] Form should have Staff ID and PIN fields
- [ ] Should be disabled if no active shift

### ✅ 3. Admin Staff Login Manager

- [ ] Navigate to `/staff-login-manager`
- [ ] Should see shift control section
- [ ] Should be able to start/end shifts
- [ ] Should generate QR codes and shareable links
- [ ] Should show active staff count

### ✅ 4. Real-time Features

- [ ] Shift status updates in real-time
- [ ] Connection indicators (WiFi icons)
- [ ] Staff count updates automatically
- [ ] Form enables/disables based on shift status

## Quick Test URLs

### Regular Staff Login

```
http://localhost:3000/staff/login
```

### Hybrid Staff Login (Test)

```
http://localhost:3000/staff/login?businessId=test-business&adminToken=test-admin-token
```

### Admin Manager

```
http://localhost:3000/staff-login-manager
```

## Expected Behavior

### Regular Mode

- Shows PIN + Business ID fields
- Uses existing `staffLogin` action
- No shift status display
- Standard form validation

### Hybrid Mode

- Shows Staff ID + PIN fields
- Displays shift status card
- Real-time connection status
- Form disabled when no active shift
- Uses hybrid authentication API

## Integration Points

1. **Route Compatibility**: No conflicts with existing routes
2. **Authentication Flow**: Seamlessly switches between modes
3. **Session Management**: Uses existing cookie-based sessions
4. **Database Integration**: Works with existing staff/business tables
5. **Real-time Updates**: Live shift status via Supabase realtime

## Security Features

- Admin session validation
- Business ownership verification
- Shift-based access control
- Audit logging
- Rate limiting
- Session timeout management
