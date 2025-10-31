# Design Document

## Overview

The Reception Dashboard Enhancement introduces a tabbed interface that transforms the current single-view reception dashboard into a dual-mode system optimized for order management workflows. The design implements persistent order state management using Zustand, enabling reception staff to seamlessly switch between creating new orders and managing existing open tickets while maintaining data integrity throughout the process.

## Architecture

### Component Architecture

```
ReceptionDashboard (Enhanced)
├── TabsContainer
│   ├── TabsList
│   │   ├── TabsTrigger (Create New Order)
│   │   └── TabsTrigger (Open Tickets)
│   ├── TabsContent (Create New Order)
│   │   └── OrderCreationInterface
│   │       ├── StaffMenuGridOrderInterface
│   │       ├── CustomerSelectionPanel
│   │       └── OrderFormPanel (with Zustand integration)
│   └── TabsContent (Open Tickets)
│       └── OpenTicketsInterface
│           ├── TicketFilters
│           ├── TicketsList (sorted by status/time)
│           └── TicketCard (clickable for payment)
└── PaymentProcessingModal (enhanced)
    ├── OrderSummary
    ├── PaymentMethodSelection
    └── PaymentConfirmation
```

### State Management Architecture

```
Zustand Store Structure
├── OrderStore (persistent)
│   ├── currentOrder: OrderState
│   ├── openTickets: OpenTicket[]
│   ├── actions:
│   │   ├── addItem()
│   │   ├── updateQuantity()
│   │   ├── removeItem()
│   │   ├── saveAsOpenTicket()
│   │   ├── loadOpenTicket()
│   │   ├── clearCurrentOrder()
│   │   └── syncWithServer()
│   └── persistence:
│       ├── localStorage integration
│       └── server synchronization
└── ReceptionDashboardStore
    ├── activeTab: string
    ├── selectedTicket: OpenTicket | null
    ├── isPaymentModalOpen: boolean
    └── filters: TicketFilters
```

## Components and Interfaces

### 1. Enhanced Reception Dashboard Container

**Purpose**: Main container component that orchestrates the tabbed interface and manages global state.

**Key Features**:

- Implements Radix UI Tabs for accessible tab navigation
- Manages tab state persistence across sessions
- Coordinates between order creation and ticket management
- Handles real-time updates from other staff members

**Props Interface**:

```typescript
interface EnhancedReceptionDashboardProps {
  staffSession: StaffSession;
  initialTab?: "create-order" | "open-tickets";
}
```

### 2. Order Creation Interface

**Purpose**: Enhanced order creation interface with persistent state management.

**Key Features**:

- Integrates existing StaffMenuGridOrderInterface
- Implements Zustand store for automatic order persistence
- Provides "Save as Open Ticket" functionality
- Maintains order state during tab switches

**State Management**:

```typescript
interface OrderCreationState {
  currentOrder: {
    id?: string;
    items: OrderItem[];
    customer: CustomerInfo;
    tableNumber?: number;
    specialInstructions?: string;
    diningOption: "dine-in" | "takeaway" | "delivery";
  };
  isDirty: boolean;
  lastSaved: Date;
}
```

### 3. Open Tickets Interface

**Purpose**: Displays and manages all open (incomplete) order tickets with sorting and filtering capabilities.

**Key Features**:

- Real-time ticket list with automatic sorting
- Visual status indicators for different order states
- Click-to-process payment functionality
- Search and filter capabilities

**Ticket Display Logic**:

```typescript
interface TicketSortingLogic {
  primarySort: "status"; // incomplete orders first
  secondarySort: "created_at"; // oldest first within status groups
  statusPriority: ["pending_payment", "preparing", "ready", "completed"];
}
```

### 4. Enhanced Ticket Card Component

**Purpose**: Individual ticket display with comprehensive order information and action buttons.

**Visual Design**:

- Order summary with customer information
- Status badges with color coding
- Time indicators (created, last updated)
- Payment status and amount
- Click-to-expand for detailed view

**Interaction States**:

```typescript
interface TicketCardStates {
  default: "clickable with hover effects";
  selected: "highlighted border and background";
  processing: "loading state during payment";
  error: "error state with retry options";
}
```

### 5. Zustand Order Store

**Purpose**: Centralized state management for order persistence and synchronization.

**Store Structure**:

```typescript
interface OrderStore {
  // Current order being created/edited
  currentOrder: OrderState | null;

  // List of open tickets
  openTickets: OpenTicket[];

  // Actions for order management
  actions: {
    // Order creation actions
    addItem: (item: MenuItem) => void;
    updateQuantity: (itemId: number, quantity: number) => void;
    removeItem: (itemId: number) => void;
    updateCustomer: (customer: CustomerInfo) => void;

    // Ticket management actions
    saveAsOpenTicket: () => Promise<string>; // returns ticket ID
    loadOpenTicket: (ticketId: string) => void;
    deleteOpenTicket: (ticketId: string) => void;

    // State management
    clearCurrentOrder: () => void;
    syncWithServer: () => Promise<void>;
  };

  // Persistence configuration
  persistence: {
    key: "reception-order-state";
    storage: "localStorage";
    partialize: (state) => { currentOrder: state.currentOrder };
  };
}
```

### 6. Payment Processing Enhancement

**Purpose**: Enhanced payment modal that integrates seamlessly with the ticket system.

**Enhanced Features**:

- Pre-populated order data from selected ticket
- Order modification capabilities during payment
- Multiple payment method support
- Receipt generation and printing
- Automatic ticket cleanup on successful payment

## Data Models

### Order State Model

```typescript
interface OrderState {
  id?: string;
  ticketNumber?: string;
  items: OrderItem[];
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  };
  tableNumber?: number;
  diningOption: "dine-in" | "takeaway" | "delivery";
  specialInstructions?: string;
  status: "draft" | "open_ticket" | "payment_pending" | "completed";
  calculations: {
    subtotal: number;
    vatAmount: number;
    serviceChargeAmount: number;
    total: number;
  };
  timestamps: {
    created: Date;
    lastModified: Date;
    savedAsTicket?: Date;
  };
}
```

### Open Ticket Model

```typescript
interface OpenTicket {
  id: string;
  ticketNumber: string;
  orderState: OrderState;
  status: "pending_payment" | "preparing" | "ready" | "completed";
  priority: "normal" | "high" | "urgent";
  createdBy: string; // staff member ID
  createdAt: Date;
  lastModified: Date;
  estimatedCompletionTime?: Date;
  paymentStatus: "pending" | "processing" | "completed" | "failed";
}
```

### Ticket Filter Model

```typescript
interface TicketFilters {
  status?: string[];
  paymentStatus?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  sortBy: "created_at" | "last_modified" | "total_amount";
  sortOrder: "asc" | "desc";
}
```

## Error Handling

### Client-Side Error Handling

**Zustand Persistence Errors**:

- Fallback to memory-only storage if localStorage fails
- Automatic retry mechanism for server synchronization
- User notification with manual save options

**Network Connectivity Issues**:

- Queue operations locally during offline periods
- Automatic sync when connectivity is restored
- Conflict resolution for concurrent modifications

**Payment Processing Errors**:

- Maintain order state during payment failures
- Provide clear error messages and retry options
- Automatic rollback for failed transactions

### Server-Side Error Handling

**Database Transaction Management**:

- Atomic operations for order state changes
- Rollback mechanisms for failed operations
- Audit logging for all state transitions

**Concurrency Control**:

- Optimistic locking for order modifications
- Conflict detection and resolution
- Real-time synchronization between staff members

## Testing Strategy

### Unit Testing

**Zustand Store Testing**:

```typescript
describe("OrderStore", () => {
  test("should persist order state to localStorage");
  test("should handle item addition and quantity updates");
  test("should save and load open tickets correctly");
  test("should sync with server on connectivity restore");
});
```

**Component Testing**:

```typescript
describe("EnhancedReceptionDashboard", () => {
  test("should switch tabs without losing order data");
  test("should display open tickets sorted correctly");
  test("should handle payment processing workflow");
});
```

### Integration Testing

**End-to-End Workflows**:

- Complete order creation and ticket saving flow
- Open ticket selection and payment processing
- Multi-staff concurrent order management
- Offline/online synchronization scenarios

**Performance Testing**:

- Large number of open tickets rendering
- Real-time updates with multiple concurrent users
- Memory usage with persistent state management

### Accessibility Testing

**Keyboard Navigation**:

- Tab navigation between interface elements
- Keyboard shortcuts for common actions
- Screen reader compatibility

**Visual Accessibility**:

- Color contrast for status indicators
- Clear visual hierarchy and focus states
- Responsive design for various screen sizes

## Performance Considerations

### State Management Optimization

**Zustand Store Optimization**:

- Selective subscription to prevent unnecessary re-renders
- Memoization of computed values (calculations, sorted lists)
- Debounced persistence to reduce localStorage writes

**Component Optimization**:

- React.memo for ticket cards to prevent unnecessary re-renders
- Virtual scrolling for large ticket lists
- Lazy loading of ticket details

### Network Optimization

**Real-time Updates**:

- WebSocket connections for live ticket updates
- Efficient diff-based synchronization
- Batched updates to reduce server load

**Caching Strategy**:

- Client-side caching of menu items and customer data
- Optimistic updates with server confirmation
- Background synchronization for non-critical data

## Security Considerations

### Data Protection

**Local Storage Security**:

- Encryption of sensitive customer data in localStorage
- Automatic cleanup of expired order data
- Session-based data isolation

**Server Communication**:

- HTTPS for all API communications
- JWT token validation for staff authentication
- Rate limiting for API endpoints

### Access Control

**Permission-Based Features**:

- Role-based access to payment processing
- Audit logging for all order modifications
- Staff-specific ticket visibility controls

## Migration Strategy

### Gradual Rollout

**Phase 1**: Implement tabbed interface with existing functionality
**Phase 2**: Add Zustand persistence for order state
**Phase 3**: Implement open tickets management
**Phase 4**: Enhance payment processing integration

### Data Migration

**Existing Order Data**:

- Migrate current order format to new OrderState model
- Preserve existing customer and payment data
- Maintain backward compatibility during transition

### Staff Training

**Interface Changes**:

- Training materials for new tabbed workflow
- Documentation for open ticket management
- Best practices for order state persistence
