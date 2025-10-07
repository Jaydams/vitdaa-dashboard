# Requirements Document

## Introduction

This feature transforms the current menu page from a table-based list view to a modern grid layout with an integrated order form. The new interface will provide a more intuitive point-of-sale experience where staff can quickly browse menu items in a visual grid and seamlessly add items to orders. The order form will be positioned on the right side of the screen, initially hidden but expandable when items are added, following the existing styling patterns and order functionality already implemented in the application.

## Requirements

### Requirement 1

**User Story:** As a restaurant staff member, I want to view menu items in a visual grid layout instead of a table, so that I can quickly identify and select items for orders.

#### Acceptance Criteria

1. WHEN the menu page loads THEN the system SHALL display menu items in a responsive grid layout
2. WHEN displaying menu items THEN each grid item SHALL show the item image, name, price, and availability status
3. WHEN the screen size changes THEN the grid SHALL automatically adjust the number of columns (responsive design)
4. WHEN a menu item is unavailable THEN the system SHALL visually indicate this with appropriate styling
5. IF a menu item has no image THEN the system SHALL display a placeholder image

### Requirement 2

**User Story:** As a restaurant staff member, I want an order form that appears when I start adding items, so that I can build orders efficiently without navigating to a separate page.

#### Acceptance Criteria

1. WHEN the menu page loads THEN the order form SHALL be initially hidden
2. WHEN I click on any menu item THEN the order form SHALL slide in from the right side
3. WHEN the order form is visible THEN it SHALL occupy approximately 30-40% of the screen width
4. WHEN I click a hide/collapse button THEN the order form SHALL slide out and become hidden
5. WHEN the order form is hidden THEN the menu grid SHALL expand to use the full width

### Requirement 3

**User Story:** As a restaurant staff member, I want to add menu items to an order by clicking on them, so that I can quickly build customer orders.

#### Acceptance Criteria

1. WHEN I click on a menu item THEN the system SHALL add it to the current order
2. WHEN an item already exists in the order THEN the system SHALL increase the quantity by 1
3. WHEN adding an item THEN the system SHALL show visual feedback (animation or highlight)
4. WHEN an item is added THEN the order form SHALL automatically show if it was hidden
5. WHEN the order form updates THEN it SHALL display the updated item count and total price

### Requirement 4

**User Story:** As a restaurant staff member, I want to manage order items within the integrated order form, so that I can modify quantities and remove items without leaving the menu page.

#### Acceptance Criteria

1. WHEN viewing the order form THEN the system SHALL display all added items with their names, quantities, and prices
2. WHEN I want to increase quantity THEN the system SHALL provide a plus button for each item
3. WHEN I want to decrease quantity THEN the system SHALL provide a minus button for each item
4. WHEN quantity reaches zero THEN the system SHALL remove the item from the order
5. WHEN I want to remove an item completely THEN the system SHALL provide a remove/delete button
6. WHEN the order becomes empty THEN the system SHALL keep the order form visible but show an empty state

### Requirement 5

**User Story:** As a restaurant staff member, I want the order form to calculate totals automatically, so that I can see the order value in real-time.

#### Acceptance Criteria

1. WHEN items are added or modified THEN the system SHALL automatically recalculate subtotal, VAT, service charge, and total
2. WHEN displaying prices THEN the system SHALL use the same formatting as the existing order system
3. WHEN calculating VAT and service charges THEN the system SHALL retrieve the current rates from the database settings configured by admin
4. WHEN the order form is visible THEN it SHALL show a clear breakdown of costs (subtotal, VAT with current rate, service charge with current rate, total)
5. WHEN calculations are performed THEN the system SHALL use the same business logic as the existing CreateOrderForm component
6. IF VAT or service charge rates are not configured THEN the system SHALL use default values (VAT 7.5%, service charge 2.5%)

### Requirement 6

**User Story:** As a restaurant staff member, I want to complete orders from the integrated form, so that I can finalize customer orders without navigating away from the menu.

#### Acceptance Criteria

1. WHEN I have items in the order THEN the system SHALL provide a "Complete Order" or "Checkout" button
2. WHEN I click the complete order button THEN the system SHALL open the full order creation modal/form
3. WHEN opening the order creation form THEN the system SHALL pre-populate it with the selected items
4. WHEN the order is successfully created THEN the system SHALL clear the integrated order form
5. WHEN the order creation is cancelled THEN the system SHALL maintain the items in the integrated order form

### Requirement 7

**User Story:** As a restaurant staff member, I want the new interface to maintain existing functionality, so that I don't lose any current capabilities.

#### Acceptance Criteria

1. WHEN using the new grid interface THEN all existing menu management features SHALL remain accessible
2. WHEN I need to add, edit, or delete menu items THEN the system SHALL provide the same functionality as the current table view
3. WHEN filtering or searching menu items THEN the system SHALL apply filters to the grid view
4. WHEN managing menu categories THEN the system SHALL maintain the existing category filtering capabilities
5. WHEN accessing menu actions THEN the system SHALL provide the same administrative functions

### Requirement 8

**User Story:** As a restaurant staff member, I want the interface to follow the existing design system, so that it feels consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN viewing the new interface THEN it SHALL use the same color scheme, typography, and spacing as existing pages
2. WHEN interacting with buttons and controls THEN they SHALL follow the established UI patterns
3. WHEN viewing the order form THEN it SHALL use the same styling as other forms in the application
4. WHEN animations or transitions occur THEN they SHALL be smooth and consistent with the application's design language
5. WHEN the interface is responsive THEN it SHALL maintain usability across different screen sizes

### Requirement 9

**User Story:** As a restaurant staff member, I want visual feedback when interacting with menu items, so that I understand when actions are successful.

#### Acceptance Criteria

1. WHEN I hover over a menu item THEN the system SHALL provide visual hover effects
2. WHEN I click a menu item THEN the system SHALL show a brief animation or highlight
3. WHEN an item is added to the order THEN the system SHALL show a success indicator
4. WHEN the order form updates THEN the system SHALL smoothly animate the changes
5. WHEN items are loading THEN the system SHALL show appropriate loading states

### Requirement 10

**User Story:** As a restaurant admin, I want to configure VAT and service charge rates from the settings page, so that the order calculations reflect the correct business rates.

#### Acceptance Criteria

1. WHEN accessing the settings page THEN the system SHALL provide fields to configure VAT percentage
2. WHEN accessing the settings page THEN the system SHALL provide fields to configure service charge percentage
3. WHEN I update VAT or service charge rates THEN the system SHALL save these settings to the database
4. WHEN VAT or service charge rates are updated THEN all new order calculations SHALL use the updated rates
5. WHEN rates are not configured THEN the system SHALL use default values (VAT 7.5%, service charge 2.5%)
6. WHEN displaying rates in the order form THEN the system SHALL show the actual percentage being applied
