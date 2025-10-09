# Implementation Plan

- [x] 1. Fix CreateOrderForm infinite loop and state management issues

  - Implement memoization for expensive calculations using useMemo for totals calculation
  - Add useCallback for event handlers to prevent unnecessary re-renders
  - Optimize useEffect dependencies and add proper cleanup
  - Add loading state management to prevent multiple data fetches
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Update database schema for enhanced order management

  - [x] 2.1 Add cascade deletion constraints for order voiding

    - Modify foreign key constraints for order_items, payments, order_status_history tables
    - Ensure proper cascade deletion when orders are voided
    - _Requirements: 6.4, 6.5_

  - [x] 2.2 Add completed status to orders table

    - Update orders table status check constraint to include 'completed' status
    - _Requirements: 2.2, 2.5_

- [x] 3. Enhance single order page with editing capabilities

  - [x] 3.1 Create OrderEditForm component

    - Build form component with conditional field editing based on order status
    - Implement form validation using zod schema
    - Add save/cancel functionality with optimistic updates
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Implement OrderStatusManager component

    - Create status change dropdown with validation rules
    - Add status transition logic (pending → processing → delivered/cancelled)
    - Implement optimistic updates with error rollback
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.3 Add OrderVoidAction component

    - Create void button with confirmation dialog
    - Implement void functionality for pending orders only
    - Add audit logging for void operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 3.4 Update single order page layout

    - Integrate edit form, status manager, and void action components
    - Add conditional rendering based on order status and permissions
    - Implement proper error handling and loading states
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Enhance orders table with navigation and improved functionality

  - [x] 4.1 Make order table rows clickable

    - Add onClick handler to table rows for navigation to single order page
    - Implement proper cursor styling and hover effects
    - Preserve current page context for back navigation
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 4.2 Fix pagination count and functionality

    - Correct total count calculation in useOrdersRealtime hook
    - Fix pagination component to show accurate page numbers
    - Ensure pagination works correctly with filters applied
    - _Requirements: 4.2, 4.3, 4.5_

  - [x] 4.3 Implement functional order filters

    - Fix OrderFilters component to properly apply status and search filters
    - Update URL state management for filter persistence
    - Ensure filters work with pagination and maintain state
    - _Requirements: 4.1, 4.2, 4.4, 4.6_

- [x] 5. Update order actions and API endpoints

  - [x] 5.1 Enhance updateOrderStatus action

    - Add proper status transition validation
    - Implement audit logging for status changes
    - Add error handling and rollback mechanisms
    - _Requirements: 2.3, 2.4, 2.6_

  - [x] 5.2 Create updateOrder action

    - Build server action for updating order details
    - Add validation for editable fields based on order status
    - Implement proper authorization checks
    - _Requirements: 1.5, 1.6_

  - [x] 5.3 Create voidOrder action

    - Implement order deletion with cascade handling
    - Add audit logging for void operations
    - Include proper authorization and validation
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 6. Implement dynamic VAT and service charge calculation from business settings

  - [x] 6.1 Update CreateOrderForm to fetch business settings

    - Fetch VAT and service charge rates from business_settings table
    - Replace hardcoded rates (7.5%, 2.5%) with dynamic values
    - Display actual percentage rates in order summary
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 6.2 Update order calculation logic

    - Modify calculateTotals function to use dynamic rates
    - Store used rates in order record for historical accuracy
    - Update createOrder action to save VAT and service charge rates
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 7. Implement custom charges functionality

  - [x] 7.1 Create CustomChargesManager component

    - Build interface for adding/removing custom charges
    - Support both percentage and fixed amount charge types
    - Calculate charge amounts based on subtotal for percentage charges
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Integrate custom charges into order creation

    - Add custom charges section to CreateOrderForm
    - Update order summary to display individual custom charges
    - Modify total calculation to include custom charges
    - _Requirements: 8.1, 8.5, 8.6_

  - [x] 7.3 Update database operations for custom charges

    - Create order_custom_charges table with proper constraints
    - Modify createOrder action to save custom charges
    - Update fetchOrder to include custom charges data
    - _Requirements: 8.6_

- [x] 8. Make customer information optional in order creation

  - [x] 8.1 Update CreateOrderForm validation schema

    - Modify zod schema to make customer fields optional
    - Add conditional validation based on dining option
    - Update form UI to reflect optional fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Update createOrder action

    - Modify server action to handle optional customer information
    - Add default values for missing customer data
    - Ensure order creation works without customer_id
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 9. Add comprehensive error handling and user feedback

  - [x]\* 9.1 Implement error boundaries for order components

    - Create error boundary components for order forms and tables
    - Add fallback UI for component errors
    - _Requirements: 5.5, 9.5_

  - [x]\* 9.2 Add loading states and optimistic updates

    - Implement skeleton loading for order data
    - Add optimistic updates for status changes
    - Create proper loading indicators for all async operations
    - _Requirements: 1.6, 2.6, 9.5_

  - [x]\* 9.3 Enhance toast notifications and user feedback

    - Add comprehensive success/error messages

    - Implement progress indicators for long operations
    - Add confirmation dialogs for destructive actions
    - _Requirements: 1.6, 2.6, 6.6_

- [ ]\* 10. Write unit tests for order management components

  - [ ]\* 10.1 Test CreateOrderForm state management

    - Write tests for form state updates and calculations
    - Test item addition/removal logic
    - Verify memoization prevents infinite loops
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]\* 10.2 Test order editing and status management

    - Test order edit permissions and validation
    - Test status transition rules and validation
    - Test void functionality and permissions
    - _Requirements: 1.3, 1.4, 2.3, 6.1, 6.2_

  - [ ]\* 10.3 Test orders table functionality
    - Test pagination calculation and navigation
    - Test filter application and URL state management
    - Test row click navigation
    - _Requirements: 4.1, 4.2, 4.3, 9.1_
