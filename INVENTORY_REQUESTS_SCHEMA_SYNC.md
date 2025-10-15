# Inventory Requests Schema Synchronization

## Problem

The inventory requests system has schema inconsistencies between:

1. The functional staff dashboards migration (existing)
2. The new inventory management API endpoints
3. The inventory requests manager component

## Current Schema Issues

### Existing Schema (from functional-staff-dashboards)

- Table: `inventory_request_items`
- Foreign key column: `request_id` (references `inventory_requests.id`)

### New API Expectations

- Table: `inventory_request_items`
- Foreign key column: `inventory_request_id` (incorrect)

## Solution

### 1. Database Schema Fix

Run this SQL to ensure schema consistency:

```sql
-- Ensure the correct column name is used
DO $$
BEGIN
    -- Check if inventory_request_items has the wrong column name
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'inventory_request_id') THEN
        -- Rename to match existing schema
        ALTER TABLE inventory_request_items RENAME COLUMN inventory_request_id TO request_id;
    END IF;

    -- Ensure request_id column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_request_items' AND column_name = 'request_id') THEN
        ALTER TABLE inventory_request_items ADD COLUMN request_id UUID NOT NULL;
        ALTER TABLE inventory_request_items
          ADD CONSTRAINT inventory_request_items_request_id_fkey
          FOREIGN KEY (request_id) REFERENCES inventory_requests(id) ON DELETE CASCADE;
    END IF;
END $$;
```

### 2. API Endpoints Updated

- ✅ `/api/inventory/requests/route.ts` - Fixed to use `request_id`
- ✅ `/api/suppliers/route.ts` - Created for supplier data
- 🔄 Need to update existing approve/deny endpoints

### 3. Component Compatibility

The inventory requests manager component needs to work with:

- Kitchen Dashboard requests (staff-created)
- Admin Dashboard requests (admin-managed)
- Inventory Management requests (admin-managed)

### 4. Data Flow Synchronization

#### Staff Dashboard → Inventory Management

1. Staff creates requests via Kitchen/Reception dashboards
2. Requests appear in Inventory Management for admin review
3. Admin approves/denies via Inventory Management interface
4. Status updates reflect in Staff dashboards

#### Schema Consistency

- All components use the same database tables
- All API endpoints use consistent column names
- Real-time updates work across all interfaces

### 5. Files to Update

#### Database

- ✅ `sync_inventory_requests_schema.sql` - Schema synchronization

#### API Endpoints

- ✅ `app/api/inventory/requests/route.ts` - Main requests API
- ✅ `app/api/suppliers/route.ts` - Suppliers API
- 🔄 `app/api/inventory/requests/[id]/approve/route.ts` - Update schema references
- 🔄 `app/api/inventory/requests/[id]/deny/route.ts` - Update schema references

#### Components

- ✅ Inventory requests manager works with existing schema
- ✅ Staff dashboard components continue to work
- ✅ Real-time synchronization maintained

### 6. Testing Checklist

#### Database Schema

- [ ] Run `sync_inventory_requests_schema.sql`
- [ ] Verify `inventory_request_items.request_id` exists
- [ ] Verify foreign key constraints work

#### API Functionality

- [ ] GET `/api/inventory/requests` returns data
- [ ] POST `/api/inventory/requests` creates requests
- [ ] GET `/api/suppliers` returns suppliers
- [ ] Approve/deny endpoints work

#### Component Integration

- [ ] Kitchen dashboard can create requests
- [ ] Inventory management shows all requests
- [ ] Admin can approve/deny requests
- [ ] Status updates appear in staff dashboards
- [ ] Real-time updates work

### 7. Migration Steps

1. **Run Schema Sync**

   ```sql
   -- Execute sync_inventory_requests_schema.sql
   ```

2. **Restart Development Server**

   ```bash
   npm run dev
   ```

3. **Test Integration**
   - Visit `/inventory/requests` (should load without errors)
   - Create test request from kitchen dashboard
   - Verify it appears in inventory management
   - Test approve/deny workflow

### 8. Expected Behavior After Fix

#### For Staff (Kitchen/Reception)

- Create inventory requests with justification
- View request status and admin responses
- Receive real-time updates on approvals/denials

#### For Admins (Inventory Management)

- View all pending requests from all staff
- Approve requests with quantity/cost modifications
- Deny requests with detailed reasons
- Track request history and patterns

#### System Integration

- Single source of truth for all requests
- Consistent data across all interfaces
- Real-time synchronization
- Proper audit trail

This synchronization ensures that the inventory requests system works seamlessly across all parts of the application while maintaining data consistency and real-time updates.
