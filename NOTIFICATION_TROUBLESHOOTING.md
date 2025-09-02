# Notification System Troubleshooting Guide

## ✅ Integration Status

The NewOrderModal has been successfully integrated into the dashboard layout at:

- **File**: `supbase-auth/app/(dashboard)/layout.tsx`
- **Integration**: Modal is conditionally rendered when businessId is available
- **Business ID**: Retrieved using `getServerBusinessOwnerId()` helper

## 🔧 Fixed Issues

### 1. TypeScript Errors

- ✅ Fixed ESLint dependency warning in NewOrderModal
- ✅ Fixed TypeScript errors in Vitdaa App orders page
- ✅ Added proper type definitions for order data transformation

### 2. Modal Integration

- ✅ Added NewOrderModal to dashboard layout
- ✅ Integrated business ID retrieval
- ✅ Modal only renders for authenticated business owners

## 🧪 Testing the Notification System

### Step 1: Verify Database Setup

Run the RLS fix script if not already done:

```sql
-- Execute: supbase-auth/fix-order-items-rls.sql
```

### Step 2: Enable Real-time for Orders Table

```sql
-- Enable real-time replication
ALTER TABLE public.orders REPLICA IDENTITY FULL;
```

### Step 3: Test with a Real Order

1. **Get your business ID**:

```sql
SELECT id, business_name FROM public.business_owners WHERE email = 'your-email@example.com';
```

2. **Create a test order** (replace business_id with your actual ID):

```sql
INSERT INTO public.orders (
  business_id,
  customer_name,
  customer_phone,
  customer_address,
  total_amount,
  payment_method,
  dining_option,
  status,
  invoice_no,
  subtotal,
  vat_amount,
  service_charge,
  service_charge_amount,
  takeaway_packs,
  takeaway_pack_price,
  delivery_fee,
  wallet_payment_status
) VALUES (
  'your-business-id-here', -- Replace with actual business ID
  'Test Customer',
  '+1234567890',
  '123 Test Street',
  2500.00,
  'transfer',
  'indoor',
  'pending',
  'TEST-' || extract(epoch from now()),
  2200.00,
  165.00,
  135.00,
  135.00,
  0,
  0.00,
  0.00,
  'pending'
);
```

### Step 4: Verify Supabase Real-time

1. **Check Supabase Dashboard**:

   - Go to your Supabase project dashboard
   - Navigate to "Database" → "Replication"
   - Ensure the `orders` table is enabled for real-time

2. **Check Browser Console**:
   - Open browser dev tools
   - Look for Supabase connection logs
   - Should see "New pending order notification:" when orders are created

## 🔍 Common Issues & Solutions

### Issue 1: Modal Not Appearing

**Possible Causes**:

- Business ID not retrieved correctly
- User not authenticated as business owner
- Real-time subscription not working

**Solutions**:

1. Check browser console for errors
2. Verify user is logged in as business owner
3. Test with manual order insertion

### Issue 2: No Sound Notification

**Possible Causes**:

- Browser autoplay policy blocking audio
- User hasn't interacted with page yet
- Sound disabled in modal

**Solutions**:

1. Click anywhere on the page first (browser requirement)
2. Check sound toggle in modal
3. Test in different browser

### Issue 3: Real-time Not Working

**Possible Causes**:

- Real-time not enabled in Supabase
- RLS policies blocking subscription
- Network/connection issues

**Solutions**:

1. Enable real-time in Supabase dashboard
2. Check RLS policies allow SELECT on orders
3. Test connection in browser network tab

## 🎯 Expected Behavior

When working correctly, you should see:

1. **Modal Popup**: Large modal appears immediately when new order is created
2. **Sound Alert**: Audio notification plays (if enabled and browser allows)
3. **Toast Notification**: Enhanced toast message with action button
4. **Browser Notification**: Native OS notification (if permissions granted)
5. **Badge Update**: Notification badge shows pending order count

## 📊 Monitoring & Debugging

### Browser Console Logs to Look For:

```javascript
// Successful subscription
"Supabase channel subscribed: notification-orders";

// New order detected
"New pending order notification: {order_data}";

// Sound notification
"Playing notification sound";

// Modal state changes
"Opening modal for order: {order_id}";
```

### Network Tab Checks:

- WebSocket connection to Supabase real-time
- No 403/401 errors on real-time endpoints
- Successful order creation API calls

## 🚀 Next Steps

If notifications still don't work after following this guide:

1. **Check Supabase Logs**: Look for real-time connection issues
2. **Test Different Browser**: Rule out browser-specific issues
3. **Verify Database Permissions**: Ensure RLS policies are correct
4. **Check Network**: Verify WebSocket connections aren't blocked

The notification system is fully implemented and should work once the database setup is complete and real-time is properly configured.
