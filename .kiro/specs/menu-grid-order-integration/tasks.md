# Implementation Plan

- [x] 1. Set up database schema and business settings infrastructure

  - Create business_settings table migration SQL file (table doesn't exist in current schema)
  - Implement business settings server actions (CRUD operations)
  - Create business settings data fetching functions with fallback to default rates
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 2. Create core order state management

  - [x] 2.1 Implement useOrderState hook for managing order items

    - Create hook with add, update, remove item functionality
    - Implement order panel visibility state management
    - Add order calculations with dynamic VAT and service charge rates
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

  - [x] 2.2 Create useBusinessSettings hook

    - Implement settings fetching and caching
    - Add error handling and fallback to default rates
    - Create settings update functionality
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 3. Build menu grid layout components

  - [x] 3.1 Create MenuGridLayout component

    - Implement responsive layout with grid and collapsible order panel
    - Add smooth transitions for panel show/hide
    - Handle responsive behavior across screen sizes
    - _Requirements: 1.1, 1.3, 2.1, 2.4, 2.5, 8.1, 8.4, 8.5_

  - [x] 3.2 Implement MenuGrid component

    - Create responsive grid container with CSS Grid
    - Add loading skeleton states
    - Implement error handling and retry functionality
    - _Requirements: 1.1, 1.3, 7.3_

  - [x] 3.3 Build MenuItemCard component

    - Design card layout with image, name, price, and status
    - Add hover effects and click animations
    - Implement availability status visual indicators
    - Handle image loading with placeholders
    - _Requirements: 1.2, 1.4, 1.5, 9.1, 9.2, 9.3_

- [x] 4. Develop order form panel components

  - [x] 4.1 Create OrderFormPanel component

    - Build collapsible panel with smooth slide animations
    - Implement panel header with hide/show toggle
    - Add empty state when no items are selected
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.6_

  - [x] 4.2 Build OrderItemsList component

    - Display selected items with quantities and prices
    - Add quantity increment/decrement controls
    - Implement item removal functionality
    - Add smooth animations for item updates
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.4_

  - [x] 4.3 Create OrderCalculations component

    - Display subtotal, VAT, service charge, and total
    - Use dynamic rates from business settings
    - Format prices using existing formatAmount helper
    - Show percentage rates in the breakdown
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 4.4 Implement OrderActions component

    - Add "Complete Order" button

    - Handle order completion flow integration
    - Add order clearing functionality
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 5. Integrate with existing order creation system

  - [x] 5.1 Modify CreateOrderForm to accept pre-populated items

    - Update CreateOrderForm component to receive initial order items
    - Pre-populate the form with selected items from grid
    - Maintain existing form validation and submission logic
    - _Requirements: 6.2, 6.3_

  - [x] 5.2 Create order completion modal integration

    - Implement modal trigger from order panel
    - Handle successful order creation callback
    - Clear order panel state after successful creation
    - Handle cancellation to maintain order panel state
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 6. Transform menu page to use grid layout

  - [x] 6.1 Update menu page component structure

    - Replace AllMenu table component with new grid layout
    - Integrate MenuGridLayout with existing page structure
    - Maintain existing MenuActions and MenuFilters components
    - _Requirements: 1.1, 7.1, 7.2_

  - [x] 6.2 Preserve existing menu management functionality

    - Ensure add, edit, delete menu items still work
    - Maintain filtering and search capabilities
    - Keep existing pagination if needed for large datasets
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Add business settings configuration to settings page

  - [x] 7.1 Create BusinessSettingsForm component

    - Build form for VAT and service charge rate configuration
    - Add input validation for percentage values
    - Implement form submission with success/error feedback
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 7.2 Integrate settings form into existing settings page

    - Add business settings section to settings page
    - Maintain existing settings page layout and styling
    - Add loading states and error handling
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 8. Implement responsive design and animations

  - [x] 8.1 Add responsive grid breakpoints

    - Configure CSS Grid to adapt to different screen sizes
    - Ensure order panel works well on mobile devices
    - Test and adjust layouts for tablet and desktop
    - _Requirements: 1.3, 8.5_

  - [x] 8.2 Implement smooth animations and transitions

    - Add panel slide animations using CSS transitions
    - Create hover effects for menu item cards
    - Add loading animations and micro-interactions
    - Implement item addition feedback animations
    - _Requirements: 8.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Add error handling and loading states

  - [x] 9.1 Create loading skeletons for grid view

    - Build skeleton components for menu item cards
    - Add grid loading state with multiple skeleton cards
    - Implement smooth transition from loading to loaded state
    - _Requirements: 9.5_

  - [x] 9.2 Implement error boundaries and fallbacks

    - Add error boundary for menu grid components

    - Create error states with retry functionality
    - Add fallback UI for failed image loads
    - Handle network errors gracefully
    - _Requirements: Error handling requirements_

- [ ]\* 10. Write comprehensive tests

  - [ ]\* 10.1 Create unit tests for hooks and utilities

    - Test useOrderState hook functionality
    - Test useBusinessSettings hook
    - Test calculation functions and formatters
    - _Requirements: All calculation and state management requirements_

  - [ ]\* 10.2 Add component integration tests
    - Test menu grid rendering and interactions
    - Test order panel functionality
    - Test responsive behavior
    - _Requirements: All UI interaction requirements_
