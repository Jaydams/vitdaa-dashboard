# Requirements Document

## Introduction

This feature enhances the order management system in the Vitdaa POS application by implementing a comprehensive single order page with editing capabilities, improving the orders table functionality, and fixing critical bugs in the order creation process. The enhancement focuses on providing administrators with better control over order lifecycle management while maintaining data integrity and user experience.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to view and edit individual order details on a dedicated single order page, so that I can manage orders effectively and make necessary updates when needed.

#### Acceptance Criteria

1. WHEN an administrator clicks on any order in the orders table THEN the system SHALL navigate to a single order page displaying complete order details
2. WHEN the single order page loads THEN the system SHALL display order information including customer details, items, status, payment information, and timestamps
3. WHEN an order has a status other than "delivered" or "cancelled" THEN the system SHALL allow editing of order details
4. WHEN an order has a status of "delivered" or "cancelled" THEN the system SHALL display order details in read-only mode
5. WHEN an administrator saves changes to an order THEN the system SHALL validate the changes and update the order in the database
6. WHEN order changes are saved successfully THEN the system SHALL display a success notification and refresh the order data

### Requirement 2

**User Story:** As an administrator, I want to change order status from the single order page, so that I can track and manage the order lifecycle effectively.

#### Acceptance Criteria

1. WHEN viewing a single order page THEN the system SHALL display the current order status prominently
2. WHEN an order status is not "delivered" or "completed" THEN the system SHALL provide a dropdown or selection interface for changing status
3. WHEN an administrator selects a new status THEN the system SHALL validate the status transition is allowed
4. WHEN a valid status change is submitted THEN the system SHALL update the order status and log the change with timestamp
5. WHEN status is changed to "delivered" or "cancelled" THEN the system SHALL lock the order from further edits
6. WHEN status change fails THEN the system SHALL display an appropriate error message

### Requirement 3

**User Story:** As an administrator, I want to create orders without mandatory customer information, so that I can process walk-in orders or orders where customer details are not immediately available.

#### Acceptance Criteria

1. WHEN creating a new order THEN the system SHALL allow order creation with optional customer information fields
2. WHEN customer information is not provided THEN the system SHALL still allow the order to be saved with default or placeholder values
3. WHEN an order is created without customer details THEN the system SHALL mark it appropriately for later customer information updates
4. WHEN customer information is partially provided THEN the system SHALL save the available information and allow completion later
5. WHEN creating an order without customer info THEN the system SHALL generate a unique order identifier for tracking

### Requirement 4

**User Story:** As an administrator, I want functional filters and correct pagination on the orders page, so that I can efficiently find and manage orders.

#### Acceptance Criteria

1. WHEN applying filters on the orders page THEN the system SHALL filter orders based on the selected criteria
2. WHEN filters are applied THEN the system SHALL update the pagination count to reflect filtered results
3. WHEN navigating between pages THEN the system SHALL maintain applied filters and display correct page numbers
4. WHEN clearing filters THEN the system SHALL reset to show all orders with correct total count
5. WHEN the page loads THEN the system SHALL display accurate total order count and pagination controls
6. WHEN filters include date ranges THEN the system SHALL correctly filter orders within the specified timeframe

### Requirement 5

**User Story:** As an administrator, I want the create order button to work without errors, so that I can successfully initiate new orders.

#### Acceptance Criteria

1. WHEN clicking the create order button THEN the system SHALL open the order creation interface without React state errors
2. WHEN the create order modal opens THEN the system SHALL not trigger infinite re-renders or maximum update depth errors
3. WHEN the order creation form loads THEN the system SHALL initialize with proper default values and state management
4. WHEN interacting with the order creation form THEN the system SHALL handle state updates efficiently without causing performance issues
5. WHEN closing the create order modal THEN the system SHALL properly clean up state and event listeners

### Requirement 6

**User Story:** As an administrator, I want to void orders that have not been processed, so that I can permanently remove incorrect or duplicate orders from the system.

#### Acceptance Criteria

1. WHEN viewing an order with status "pending" THEN the system SHALL display a void option
2. WHEN an order status is "processing", "delivered", or "cancelled" THEN the system SHALL NOT allow voiding
3. WHEN an administrator selects void order THEN the system SHALL display a confirmation dialog with warning about permanent deletion
4. WHEN void is confirmed THEN the system SHALL permanently delete the order and all associated order items from the database
5. WHEN an order is voided THEN the system SHALL log the action in audit logs with administrator details and timestamp
6. WHEN an order is successfully voided THEN the system SHALL redirect to the orders list and display a success notification

### Requirement 7

**User Story:** As an administrator, I want order calculations to use my business's configured VAT and service charge rates, so that orders reflect my current business settings and pricing structure.

#### Acceptance Criteria

1. WHEN creating an order THEN the system SHALL retrieve VAT and service charge rates from the business_settings table
2. WHEN calculating order totals THEN the system SHALL apply the configured VAT rate instead of hardcoded 7.5%
3. WHEN calculating order totals THEN the system SHALL apply the configured service charge rate instead of hardcoded 2.5%
4. WHEN business settings are updated THEN new orders SHALL use the updated rates immediately
5. WHEN displaying order calculations THEN the system SHALL show the actual percentage rates used

### Requirement 8

**User Story:** As an administrator, I want to add custom charges to orders with either percentage or fixed amounts, so that I can account for additional fees like delivery charges, special service fees, or promotional discounts.

#### Acceptance Criteria

1. WHEN creating an order THEN the system SHALL provide an interface to add custom charges
2. WHEN adding a custom charge THEN the system SHALL allow selection between percentage-based or fixed amount
3. WHEN adding a percentage-based charge THEN the system SHALL calculate the amount based on the subtotal
4. WHEN adding a fixed amount charge THEN the system SHALL add the exact amount to the order total
5. WHEN multiple custom charges are added THEN the system SHALL display each charge separately in the order summary
6. WHEN custom charges are applied THEN the system SHALL store them in the database for order history and reporting

### Requirement 9

**User Story:** As an administrator, I want reliable navigation between the orders table and individual order pages, so that I can seamlessly manage orders without losing context.

#### Acceptance Criteria

1. WHEN clicking on any order row in the orders table THEN the system SHALL navigate to the corresponding single order page
2. WHEN navigating to a single order page THEN the system SHALL preserve the previous page context for easy return navigation
3. WHEN returning from a single order page THEN the system SHALL maintain the previous filters and pagination state
4. WHEN an order is updated on the single order page THEN the system SHALL reflect changes in the orders table upon return
5. WHEN navigation occurs THEN the system SHALL provide appropriate loading states and error handling
