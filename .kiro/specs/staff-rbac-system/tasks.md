# Implementation Plan

- [x] 1. Database schema updates and type definitions

  - Run the provided SQL migrations to add admin_pin_hash to business_owner table and create staff_sessions table
  - Update existing TypeScript interfaces in types/auth.d.ts to include new fields and session types
  - Update types/staff.d.ts to use the new role constraints (reception, kitchen, bar, accountant)
  - _Requirements: 1.4, 1.5, 3.2, 9.1_

- [x] 2. Enhanced authentication utilities and middleware

- [x] 2.1 Extend auth-utils.ts with admin PIN and session management functions

  - Add hashAdminPin, verifyAdminPin functions for business owner elevated access
  - Create generateSessionToken, validateStaffSession functions for staff session management
  - Add createStaffSession, terminateStaffSession functions for session lifecycle management
  - _Requirements: 3.1.2, 3.1.3, 9.1, 9.2_

- [x] 2.2 Create staff session middleware for role-based access control

  - Write middleware to validate staff sessions and extract permissions
  - Implement role-based route protection for staff dashboard areas
  - Add session expiration handling and automatic cleanup
  - _Requirements: 3.4, 3.5, 9.3_

- [x] 3. Admin PIN management system

- [x] 3.1 Create AdminPINSetup component for initial admin PIN creation

  - Build form component for business owners to set their admin PIN
  - Add PIN confirmation and strength validation
  - Integrate with existing business owner profile setup flow
  - _Requirements: 3.1.1, 3.1.2_

- [x] 3.2 Implement AdminPINVerification component for elevated access

  - Create modal/dialog component for admin PIN entry
  - Add PIN masking and attempt limiting (5 attempts, 30-minute lockout)
  - Implement temporary elevated session management with expiration
  - _Requirements: 3.1.2, 3.1.3, 3.1.4, 3.1.5_

- [x] 4. Staff management interface enhancements

- [x] 4.1 Update staff creation form with new role constraints

  - Modify existing staff creation form to use new role options (reception, kitchen, bar, accountant)
  - Add role-specific permission assignment based on design specifications
  - Implement form validation for required fields and role constraints
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.2 Create StaffSignInInterface component for dashboard

  - Build interface showing available staff members for sign-in
  - Add PIN input form for staff authentication by business owner
  - Display currently signed-in staff with sign-out options
  - Implement bulk sign-out functionality for shift changes
  - _Requirements: 3.1, 3.2, 3.3, 8.2, 8.3_

- [x] 4.3 Enhance staff list view with session status

  - Update existing StaffTable component to show active session status
  - Add indicators for currently signed-in staff members
  - Include last login time and session duration information
  - _Requirements: 8.1, 9.1, 9.2_

- [x] 5. Staff authentication and session management

- [x] 5.1 Create staff session creation and validation logic

  - Implement createStaffSession function in auth-actions.ts
  - Add session token generation and secure storage
  - Create validateStaffSession middleware for protected routes
  - _Requirements: 3.2, 3.3, 9.1, 9.2_

- [x] 5.2 Implement staff sign-in action for business owners

  - Create signInStaff server action that validates staff PIN and creates session
  - Add session tracking with business owner who signed them in
  - Implement session expiration (8 hours) and cleanup logic
  - _Requirements: 3.1, 3.2, 3.3, 9.1_

- [x] 5.3 Build staff sign-out functionality

  - Create signOutStaff server action for individual staff sign-out
  - Implement bulkSignOutStaff for signing out multiple staff members
  - Add session cleanup and audit logging
  - _Requirements: 3.5, 8.2, 8.3, 9.2_

- [x] 6. Role-based dashboard system

- [x] 6.1 Create base RoleBasedDashboard component

  - Build main dashboard component that renders based on staff role
  - Implement permission checking and UI element filtering
  - Add role-specific navigation and menu items
  - _Requirements: 3.4, 4.1, 5.1, 6.1, 7.1_

- [x] 6.2 Implement ReceptionDashboard with order and table management

  - Create dashboard for reception staff with order management interface
  - Add table status view and assignment functionality
  - Implement customer information access and payment processing
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.3 Build KitchenDashboard for order preparation management

  - Create kitchen-specific dashboard showing pending orders
  - Add order status update functionality (in-preparation, ready, completed)
  - Implement kitchen inventory viewing and stock update features
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.4 Develop BarDashboard for beverage operations

  - Build bar staff dashboard for beverage order management
  - Add drink preparation status updates and inventory management
  - Implement restock request functionality for bar items
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.5 Create AccountantDashboard for financial operations

  - Build financial dashboard with reports and transaction access
  - Add payment processing, refund handling, and dispute management
  - Implement financial report generation (daily, weekly, monthly)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [-] 7. Permission system implementation

- [x] 7.1 Create permission checking utilities

  - Build hasPermission function to check staff permissions against required permissions
  - Implement role-based permission assignment during staff creation
  - Add dynamic permission checking for UI components and API endpoints
  - _Requirements: 1.5, 2.2, 2.3, 2.4, 2.5_

- [x] 7.2 Implement PermissionGuard component for UI protection

  - Create wrapper component that conditionally renders based on permissions
  - Add fallback UI for unauthorized access attempts
  - Implement permission-based navigation menu filtering
  - _Requirements: 3.4, 4.1, 5.1, 6.1, 7.1_

- [x] 8. Enhanced staff management actions

- [x] 8.1 Update existing staff CRUD operations with new role system

  - Modify createStaff action to use new role constraints and permission assignment
  - Update updateStaff action to handle role changes and permission updates
  - Add validation for role-specific requirements and constraints
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8.2 Implement admin PIN management actions

  - Create setAdminPin server action for initial admin PIN setup
  - Add updateAdminPin action for changing existing admin PIN
  - Implement verifyAdminPin action for elevated access verification
  - _Requirements: 3.1.1, 3.1.2, 3.1.3, 3.1.4_

- [x] 9. Session monitoring and management features

- [x] 9.1 Create staff activity tracking system

  - Implement activity logging for staff actions and page visits
  - Add session duration tracking and idle time monitoring
  - Create staff activity summary views for business owners
  - _Requirements: 8.1, 9.2, 9.4_

- [x] 9.2 Build session management dashboard for business owners

  - Create interface showing all active staff sessions
  - Add remote sign-out functionality for individual staff
  - Implement session monitoring with real-time updates
  - _Requirements: 8.1, 8.2, 8.4, 9.1, 9.2_

- [x] 10. Security enhancements and error handling

- [x] 10.1 Implement rate limiting and security measures

  - Add rate limiting for staff PIN attempts (3 attempts, 15-minute lockout)

  - Implement admin PIN rate limiting (5 attempts, 30-minute lockout)
  - Create audit logging for security events and failed attempts
  - _Requirements: 3.1.5, 8.4, 9.5_

- [x] 10.2 Add comprehensive error handling and user feedback

  - Implement error boundaries for role-based components
  - Add user-friendly error messages for authentication failures
  - Create fallback UI for permission denied and session expired states
  - _Requirements: 3.4, 8.4, 9.5_

- [x] 11. Testing and validation

- [x] 11.1 Create unit tests for authentication and permission functions

  - Write tests for PIN hashing, verification, and session management functions
  - Add tests for permission checking and role-based access control
  - Test error handling and edge cases for authentication flows
  - _Requirements: All requirements - validation_

- [x] 11.2 Implement integration tests for staff management workflows

  - Create end-to-end tests for staff creation, sign-in, and role-based access
  - Test session management, expiration, and cleanup processes
  - Validate admin PIN functionality and elevated access workflows
  - _Requirements: All requirements - integration testing_

- [x] 12. Documentation and deployment preparation

- [x] 12.1 Update middleware.ts to handle staff session routing

  - Modify existing middleware to recognize and validate staff sessions
  - Add role-based route protection for staff dashboard areas
  - Implement automatic redirects based on session type and permissions
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 12.2 Create staff onboarding documentation and user guides

  - Write documentation for business owners on staff management features
  - Create role-specific user guides for staff dashboard functionality
  - Add troubleshooting guide for common authentication and permission issues
  - _Requirements: All requirements - user documentation_
