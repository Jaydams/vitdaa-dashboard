# Design Document

## Overview

This design transforms the menu page from a table-based list view to a modern grid layout with an integrated order form. The solution leverages existing order functionality while introducing a new visual interface that enhances the point-of-sale experience. The design maintains all current menu management capabilities while adding seamless order creation functionality directly from the menu browsing interface.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Menu Page Layout                         │
├─────────────────────────────────┬───────────────────────────┤
│                                 │                           │
│        Menu Grid View           │    Order Form Panel      │
│                                 │     (Collapsible)         │
│  ┌─────┐ ┌─────┐ ┌─────┐       │                           │
│  │Item │ │Item │ │Item │       │  ┌─────────────────────┐  │
│  │  1  │ │  2  │ │  3  │       │  │   Order Summary     │  │
│  └─────┘ └─────┘ └─────┘       │  │                     │  │
│                                 │  │ - Selected Items    │  │
│  ┌─────┐ ┌─────┐ ┌─────┐       │  │ - Quantities        │  │
│  │Item │ │Item │ │Item │       │  │ - Calculations      │  │
│  │  4  │ │  5  │ │  6  │       │  │                     │  │
│  └─────┘ └─────┘ └─────┘       │  └─────────────────────┘  │
│                                 │                           │
└─────────────────────────────────┴───────────────────────────┘
```

### Component Hierarchy

```
MenuPage
├── MenuPageHeader (PageTitle, Actions, Filters)
├── MenuGridLayout
│   ├── MenuGrid
│   │   ├── MenuItemCard[]
│   │   └── MenuGridSkeleton (loading state)
│   └── OrderFormPanel
│       ├── OrderSummary
│       ├── OrderItemsList
│       ├── OrderCalculations
│       └── OrderActions
└── CreateOrderModal (existing, reused)
```

## Components and Interfaces

### Core Components

#### 1. MenuGridLayout

**Purpose:** Main layout component that manages the grid and order panel layout
**Props:**

```typescript
interface MenuGridLayoutProps {
  children: React.ReactNode;
  orderPanelVisible: boolean;
  onToggleOrderPanel: () => void;
}
```

#### 2. MenuGrid

**Purpose:** Displays menu items in a responsive grid layout
**Props:**

```typescript
interface MenuGridProps {
  menuItems: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  loading?: boolean;
  error?: string;
}
```

#### 3. MenuItemCard

**Purpose:** Individual menu item display card
**Props:**

```typescript
interface MenuItemCardProps {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
  className?: string;
}
```

#### 4. OrderFormPanel

**Purpose:** Collapsible order form panel
**Props:**

```typescript
interface OrderFormPanelProps {
  visible: boolean;
  orderItems: OrderItem[];
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemoveItem: (itemId: number) => void;
  onCompleteOrder: () => void;
  onToggleVisibility: () => void;
  businessSettings: BusinessSettings;
}
```

### Data Models

#### Extended MenuItem Interface

```typescript
interface MenuItem {
  id: number;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  status?: "available" | "unavailable";
  menu_name?: string;
}
```

#### OrderItem Interface

```typescript
interface OrderItem {
  menu_item_id: number;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}
```

#### BusinessSettings Interface

```typescript
interface BusinessSettings {
  id: string;
  business_id: string;
  vat_rate: number; // Default: 7.5
  service_charge_rate: number; // Default: 2.5
  created_at: string;
  updated_at: string;
}
```

## Data Models

### Database Schema Extensions

#### Business Settings Table

```sql
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
  vat_rate DECIMAL(5,2) DEFAULT 7.5,
  service_charge_rate DECIMAL(5,2) DEFAULT 2.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);
```

**Note:** This table needs to be added to your existing database schema as it's not currently present in your database.sql file.

### State Management

#### Order State Hook

```typescript
interface UseOrderStateReturn {
  orderItems: OrderItem[];
  isOrderPanelVisible: boolean;
  addItem: (item: MenuItem) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
  clearOrder: () => void;
  toggleOrderPanel: () => void;
  calculations: OrderCalculations;
}

interface OrderCalculations {
  subtotal: number;
  vatAmount: number;
  serviceChargeAmount: number;
  total: number;
  vatRate: number;
  serviceChargeRate: number;
}
```

#### Business Settings Hook

```typescript
interface UseBusinessSettingsReturn {
  settings: BusinessSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
}
```

## Error Handling

### Error Boundaries

- **MenuGridErrorBoundary:** Catches errors in menu grid rendering
- **OrderPanelErrorBoundary:** Handles order panel specific errors

### Error States

- **Menu Loading Error:** Display retry mechanism with error message
- **Order Calculation Error:** Show fallback calculations with warning
- **Settings Loading Error:** Use default rates with notification

### Fallback Mechanisms

- **Image Loading:** Placeholder images for failed menu item images
- **Settings Unavailable:** Default VAT (7.5%) and service charge (2.5%) rates
- **Network Issues:** Cached menu data with offline indicator

## Testing Strategy

### Unit Testing

- **Component Testing:** Test individual components with React Testing Library
- **Hook Testing:** Test custom hooks with @testing-library/react-hooks
- **Utility Functions:** Test calculation functions and formatters

### Integration Testing

- **Order Flow:** Test complete add-to-order workflow
- **Settings Integration:** Test VAT/service charge rate application
- **Responsive Behavior:** Test grid layout across different screen sizes

### E2E Testing

- **Menu Browsing:** Test grid navigation and item selection
- **Order Creation:** Test complete order creation flow
- **Settings Management:** Test admin settings configuration

### Performance Testing

- **Grid Rendering:** Test performance with large menu datasets
- **Order Calculations:** Test calculation performance with many items
- **Image Loading:** Test lazy loading and placeholder behavior

## Implementation Phases

### Phase 1: Core Grid Layout

- Create MenuGridLayout component
- Implement MenuGrid with responsive design
- Create MenuItemCard component
- Add basic click handling

### Phase 2: Order Integration

- Implement OrderFormPanel component
- Create order state management hook
- Add order calculations
- Integrate with existing order creation

### Phase 3: Settings Integration

- Create business settings database table
- Implement settings management API
- Add settings configuration UI
- Integrate dynamic rates in calculations

### Phase 4: Polish and Optimization

- Add animations and transitions
- Implement loading states and skeletons
- Add error boundaries and fallbacks
- Performance optimization and testing
