# Infinite Skeleton Loading Fix

## Problem

The order creation modal was showing the skeleton loading state indefinitely, preventing users from creating orders.

## Root Cause

The `fetchData` function in `CreateOrderForm.tsx` had multiple early `return` statements that didn't set `dataLoading` to `false`, causing the loading state to persist indefinitely when:

- User authentication failed
- Business owner lookup failed
- Menu items fetch failed
- Tables fetch failed
- Delivery locations fetch failed

## Fixes Applied

### 1. ✅ Fixed Early Returns

Added `setDataLoading(false)` to all early return statements in the `fetchData` function:

```typescript
if (!user) {
  OrderNotifications.permissionError({
    description: "Please log in to continue",
  });
  setDataLoading(false); // ← Added this
  return;
}
```

### 2. ✅ Added Request Timeout

Added a 30-second timeout to prevent infinite loading:

```typescript
const fetchData = useCallback(async () => {
  if (dataLoaded.current || dataLoading) return;

  setDataLoading(true);

  // Add timeout to prevent infinite loading
  const timeoutId = setTimeout(() => {
    setDataLoading(false);
    OrderNotifications.networkError({
      description: "Request timed out. Please try again.",
    });
  }, 30000); // 30 second timeout

  try {
    // ... fetch logic
  } finally {
    clearTimeout(timeoutId);
    setDataLoading(false);
  }
}, []);
```

### 3. ✅ Added Fallback Timer

Added a 10-second fallback timer to show the form even if data loading fails:

```typescript
const [showFormAnyway, setShowFormAnyway] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    setShowFormAnyway(true);
  }, 10000); // Show form after 10 seconds regardless

  return () => clearTimeout(timer);
}, []);

if ((dataLoading || settingsLoading) && !showFormAnyway) {
  return <OrderFormSkeleton />;
}
```

### 4. ✅ Added Warning Message

Added a warning message when the form is shown with incomplete data:

```typescript
const isDataIncomplete = (dataLoading || settingsLoading) && showFormAnyway;

// In the form JSX:
{
  isDataIncomplete && (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800">
        ⚠️ Some data is still loading. The form may have limited functionality.
      </p>
    </div>
  );
}
```

## Result

- ✅ Order creation modal no longer shows infinite skeleton
- ✅ Form appears within 10 seconds maximum, even with network issues
- ✅ Users get clear error messages when data fails to load
- ✅ Form shows warning when data is incomplete but still functional
- ✅ Proper timeout handling prevents hanging requests

## Testing

1. **Normal Case**: Form loads normally when data fetches successfully
2. **Network Issues**: Form shows after 10 seconds with warning message
3. **Auth Issues**: Form shows error notification and stops loading
4. **Timeout**: Form shows timeout error after 30 seconds and stops loading

The order creation functionality should now work reliably even with the network timeout issues you were experiencing.
