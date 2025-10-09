# Design Document

## Overview

The Enhanced Order Management system builds upon the existing order infrastructure in the Vitdaa POS application to provide comprehensive order lifecycle management. The design focuses on enhancing the single order page with editing capabilities, fixing the infinite loop bug in order creation, implementing order voiding functionality, and improving the orders table with functional filters and navigation.

The system leverages the existing database schema with minimal modifications and extends the current React components with improved state management and user experience patterns.

## Architecture

### Component Architecture

```
Orders Management System
├── Orders List Page (/orders)
│   ├── OrderFilters (Enhanced)
│   ├── CreateOrderButton (Fixed)
│   ├── CreateOrderForm (State Management Fixed)
│   └── OrdersTable
│       ├── OrderRow (Clickable Navigation)
│       └── Pagination (Fixed Count)
├── Single Order Page (/orders/[id])
│   ├── OrderHeader (Status Management)
│   ├── OrderEditForm (Conditional Editing)
│   ├── OrderStatusManager
│   ├── OrderVoidAction
│   └── OrderDetails (Read-only sections)
└── Shared Components
    ├── OrderStatusBadge
    ├── OrderActionDropdown
    └── ConfirmationDialog
```

### State Management Flow

```
Order Management State Flow
├── Order Creation
│   ├── Form State (useForm + useState)
│   ├── Menu Items Loading (useEffect)
│   └── Submission (Server Action)
├── Order Editing
│   ├── Order Data Fetching (Server Component)
│   ├── Edit Mode Toggle (useState)
│   ├── Form Validation (zod schema)
│   └── Update Submission (Server Action)
├── Status Management
│   ├── Status Change (Optimistic Updates)
│   ├── Validation (Business Rules)
│   └── Audit Logging (Server Action)
└── Order Voiding
    ├── Confirmation Dialog (useState)
    ├── Cascade Deletion (Database)
    └── Audit Logging (Server Action)
```

## Components and Interfaces

### Enhanced CreateOrderForm Component

**Problem Identification**: The infinite loop occurs due to improper useEffect dependencies and state updates triggering re-renders.

**Solution**:

- Memoize expensive calculations using `useMemo`
- Optimize useEffect dependencies
- Implement proper cleanup in useEffect
- Use `useCallback` for event handlers

```typescript
interface CreateOrderFormProps {
  onSuccess: () => void;
  initialItems?: OrderItem[];
}

// Key fixes:
// 1. Memoize calculations
const totals = useMemo(
  () => calculateTotals(),
  [selectedItems, takeawayPacks, deliveryFee]
);

// 2. Optimize data fetching
const fetchData = useCallback(async () => {
  // Fetch logic with proper error handling
}, []);

// 3. Proper cleanup
useEffect(() => {
  fetchData();
  return () => {
    // Cleanup subscriptions
  };
}, [fetchData]);
```

### Enhanced Single Order Page

**Current State**: Basic read-only order display
**Enhanced State**: Conditional editing with status-based permissions

```typescript
interface OrderPageProps {
  params: { id: string };
}

interface OrderEditState {
  isEditing: boolean;
  editableFields: OrderEditableFields;
  hasUnsavedChanges: boolean;
}

interface OrderEditableFields {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  dining_option: "indoor" | "delivery";
  table_id?: string;
  delivery_location_id?: string;
  rider_name?: string;
  rider_phone?: string;
  notes?: string;
  items: OrderItem[];
}
```

### Order Status Management Component

```typescript
interface OrderStatusManagerProps {
  order: Order;
  onStatusChange: (newStatus: OrderStatus) => Promise<void>;
  disabled?: boolean;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["delivered", "cancelled"],
  delivered: [], // Final state
  cancelled: [], // Final state
};
```

### Order Void Component

```typescript
interface OrderVoidActionProps {
  order: Order;
  onVoidSuccess: () => void;
}

interface VoidConfirmationState {
  isOpen: boolean;
  isLoading: boolean;
  confirmationText: string;
}
```

### Custom Charges Component

```typescript
interface CustomChargesManagerProps {
  charges: CustomCharge[];
  onChargesChange: (charges: CustomCharge[]) => void;
  subtotal: number;
  disabled?: boolean;
}

interface CustomCharge {
  id?: string;
  charge_name: string;
  charge_type: "percentage" | "fixed";
  charge_value: number;
  calculated_amount: number;
}

interface AddChargeFormState {
  isOpen: boolean;
  chargeName: string;
  chargeType: "percentage" | "fixed";
  chargeValue: number;
}
```

### Dynamic Business Settings Integration

```typescript
interface BusinessSettings {
  vat_rate: number;
  service_charge_rate: number;
  default_takeaway_pack_price: number;
  enabled_dining_options: string[];
}

interface OrderCalculationContext {
  businessSettings: BusinessSettings;
  subtotal: number;
  customCharges: CustomCharge[];
  takeawayPacks: number;
  deliveryFee: number;
}
```

### Enhanced Orders Table

**Current Issues**:

- Rows not clickable
- Pagination count incorrect
- Filters not functional

**Enhancements**:

- Clickable row navigation
- Proper pagination calculation
- Real-time filter application

```typescript
interface OrdersTableProps {
  columns: ColumnDef<Order>[];
  data: Order[];
  pagination: PaginationInfo;
  onRowClick: (orderId: string) => void;
}

// Enhanced column definition with click handler
const enhancedColumns: ColumnDef<Order>[] = [
  // ... existing columns
  {
    id: "actions",
    cell: ({ row }) => (
      <OrderActionDropdown
        order={row.original}
        onEdit={() => router.push(`/orders/${row.original.id}`)}
        onVoid={handleVoid}
      />
    ),
  },
];
```

## Data Models

### Database Schema Updates

The existing schema supports most requirements, but we need to add cascade deletion for voiding and custom charges:

```sql
-- Ensure proper cascade deletion for order voiding
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE public.payments
ADD CONSTRAINT payments_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;
ALTER TABLE public.order_status_history
ADD CONSTRAINT order_status_history_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Add completed status option
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text]));

-- Create custom charges table for additional order fees
CREATE TABLE public.order_custom_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  charge_name text NOT NULL,
  charge_type text NOT NULL CHECK (charge_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  charge_value numeric NOT NULL,
  calculated_amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_custom_charges_pkey PRIMARY KEY (id),
  CONSTRAINT order_custom_charges_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Add custom charges total to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_charges_total integer DEFAULT 0;

-- Add VAT and service charge rates used for the order (for historical accuracy)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 7.5;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_charge_rate numeric DEFAULT 2.5;
```

### TypeScript Interfaces

```typescript
// Enhanced Order interface
interface Order {
  id: string;
  business_id: string;
  customer_id?: string;
  invoice_no: string;
  order_time: string;
  dining_option: "indoor" | "delivery";
  table_id?: string;
  delivery_location_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  subtotal: number;
  vat_amount: number;
  service_charge: number;
  total_amount: number;
  custom_charges_total: number;
  vat_rate: number;
  service_charge_rate: number;
  payment_method: OrderMethod;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  customer?: Customer;
  items?: OrderItem[];
  payment?: Payment;
  table?: Table;
  delivery_location?: DeliveryLocation;
  custom_charges?: CustomCharge[];
}

// Custom charge interface
interface CustomCharge {
  id: string;
  order_id: string;
  charge_name: string;
  charge_type: "percentage" | "fixed";
  charge_value: number;
  calculated_amount: number;
  created_at: string;
}

// Order editing permissions
interface OrderPermissions {
  canEdit: boolean;
  canChangeStatus: boolean;
  canVoid: boolean;
  editableFields: string[];
}

// Audit log entry for voiding
interface OrderVoidAudit {
  order_id: string;
  invoice_no: string;
  voided_by: string;
  voided_at: string;
  reason?: string;
  original_order_data: Order;
}
```

## Error Handling

### CreateOrderForm Error Resolution

**Root Cause**: Infinite re-renders due to:

1. useEffect with missing dependencies
2. State updates in render cycle
3. Expensive calculations on every render

**Solution Strategy**:

```typescript
// 1. Memoize expensive calculations
const totals = useMemo(() => {
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.total_price,
    0
  );
  const vat = Math.round(subtotal * 0.075);
  const serviceCharge = Math.round(subtotal * 0.025);
  const takeawayTotal = takeawayPacks * takeawayPackPrice;
  const total = subtotal + vat + serviceCharge + takeawayTotal + deliveryFee;
  return { subtotal, vat, serviceCharge, takeawayTotal, total };
}, [selectedItems, takeawayPacks, takeawayPackPrice, deliveryFee]);

// 2. Stable callback references
const handleAddItem = useCallback((item: MenuItem, quantity: number) => {
  setSelectedItems((prev) => {
    const existing = prev.find((i) => i.menu_item_id === item.id);
    if (existing) {
      return prev.map((i) =>
        i.menu_item_id === item.id
          ? {
              ...i,
              quantity: i.quantity + quantity,
              total_price: (i.quantity + quantity) * i.menu_item_price,
            }
          : i
      );
    }
    return [
      ...prev,
      {
        menu_item_id: item.id,
        menu_item_name: item.name,
        menu_item_price: item.price,
        quantity,
        total_price: item.price * quantity,
        image_url: item.image_url,
      },
    ];
  });
}, []);

// 3. Optimized data fetching
const fetchData = useCallback(async () => {
  if (dataLoaded.current) return;

  try {
    setLoading(true);
    // Fetch logic
    dataLoaded.current = true;
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
  }
}, []);
```

### Order Editing Error Handling

```typescript
// Validation before allowing edits
const validateOrderEditable = (order: Order): OrderPermissions => {
  const canEdit = !["delivered", "cancelled"].includes(order.status);
  const canVoid = order.status === "pending";

  return {
    canEdit,
    canChangeStatus: true,
    canVoid,
    editableFields: canEdit
      ? [
          "customer_name",
          "customer_phone",
          "customer_address",
          "dining_option",
          "table_id",
          "delivery_location_id",
          "rider_name",
          "rider_phone",
          "notes",
        ]
      : [],
  };
};

// Optimistic updates with rollback
const handleStatusChange = async (newStatus: OrderStatus) => {
  const previousStatus = order.status;

  // Optimistic update
  setOrder((prev) => ({ ...prev, status: newStatus }));

  try {
    await updateOrderStatus(order.id, newStatus);
    toast.success("Order status updated successfully");
  } catch (error) {
    // Rollback on error
    setOrder((prev) => ({ ...prev, status: previousStatus }));
    toast.error("Failed to update order status");
  }
};
```

## Testing Strategy

### Unit Testing Focus Areas

1. **CreateOrderForm State Management**

   - Test form state updates don't cause infinite loops
   - Verify calculation memoization works correctly
   - Test item addition/removal logic

2. **Order Editing Permissions**

   - Test status-based edit permissions
   - Verify field-level editing restrictions
   - Test validation rules

3. **Order Voiding Logic**

   - Test cascade deletion behavior
   - Verify audit log creation
   - Test permission checks

4. **Pagination and Filtering**
   - Test filter application
   - Verify pagination count accuracy
   - Test search functionality

### Integration Testing

1. **Order Lifecycle Flow**

   - Create order → Edit order → Change status → Complete/Cancel
   - Test navigation between orders list and single order page
   - Verify state persistence across navigation

2. **Database Operations**

   - Test order creation with all field combinations
   - Test order updates with partial data
   - Test order voiding with cascade deletion

3. **Real-time Updates**
   - Test order status changes reflect in orders list
   - Verify pagination updates after order creation/deletion
   - Test filter state persistence

### Performance Testing

1. **CreateOrderForm Optimization**

   - Measure render count reduction after optimization
   - Test form responsiveness with large menu item lists
   - Verify memory leak prevention

2. **Orders Table Performance**
   - Test pagination with large datasets
   - Measure filter application speed
   - Test real-time update performance

## Implementation Notes

### Phase 1: Fix CreateOrderForm Infinite Loop

- Implement memoization and callback optimization
- Add proper useEffect cleanup
- Test form stability

### Phase 2: Enhance Single Order Page

- Add conditional editing based on order status
- Implement order status management
- Add order voiding functionality

### Phase 3: Improve Orders Table

- Make rows clickable for navigation
- Fix pagination count calculation
- Implement functional filters

### Phase 4: Database Updates

- Apply cascade deletion constraints
- Add completed status option
- Test data integrity

### Security Considerations

1. **Authorization Checks**

   - Verify business owner can only access their orders
   - Check edit permissions before allowing modifications
   - Validate void permissions

2. **Data Validation**

   - Server-side validation for all order updates
   - Sanitize user inputs
   - Validate status transition rules

3. **Audit Trail**
   - Log all order modifications
   - Track void operations with user details
   - Maintain order status history

This design provides a comprehensive enhancement to the order management system while maintaining backward compatibility and ensuring robust error handling and security.
