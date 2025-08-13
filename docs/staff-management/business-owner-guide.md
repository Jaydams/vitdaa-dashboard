# Business Owner Guide - Staff Management System

This guide covers all aspects of managing staff members using the Role-Based Access Control (RBAC) system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin PIN Setup](#admin-pin-setup)
3. [Adding Staff Members](#adding-staff-members)
4. [Staff Roles and Permissions](#staff-roles-and-permissions)
5. [Staff Sign-In Management](#staff-sign-in-management)
6. [Session Monitoring](#session-monitoring)
7. [Staff Management Operations](#staff-management-operations)
8. [Security Best Practices](#security-best-practices)

## Getting Started

The Staff Management System is accessible from your business owner dashboard. Navigate to the "Staff" section to begin managing your team.

### Prerequisites

- Active business owner account
- Admin PIN setup (required for sensitive operations)

## Admin PIN Setup

The Admin PIN provides elevated access for sensitive operations while staff are signed in.

### Setting Up Your Admin PIN

1. Navigate to your profile settings
2. Click "Set Admin PIN"
3. Enter a secure 4-6 digit PIN
4. Confirm your PIN
5. Save the changes

**Important**: Your Admin PIN should be different from any staff PINs and kept confidential.

### When Admin PIN is Required

- Adding new staff members
- Modifying staff roles or permissions
- Resetting staff PINs
- Accessing financial reports (when accountant staff are active)
- Bulk staff operations

### Admin PIN Security

- Maximum 5 attempts before 30-minute lockout
- PIN is hashed and stored securely
- Elevated session expires after 15 minutes of inactivity

## Adding Staff Members

### Step-by-Step Process

1. **Access Staff Management**

   - Go to Dashboard → Staff
   - Click "Add New Staff Member"

2. **Enter Staff Information**

   - First Name (required)
   - Last Name (required)
   - Email (optional, must be unique)
   - Phone Number (optional)

3. **Assign Role**

   - Select from: Reception, Kitchen, Bar, or Accountant
   - Role determines default permissions

4. **Set Staff PIN**

   - Create a 4-6 digit PIN for the staff member
   - PIN will be hashed and stored securely
   - Share PIN securely with the staff member

5. **Review and Save**
   - Verify all information is correct
   - Click "Create Staff Member"

### Staff Information Requirements

| Field      | Required | Notes                            |
| ---------- | -------- | -------------------------------- |
| First Name | Yes      | Display name for staff           |
| Last Name  | Yes      | Full identification              |
| Email      | No       | Must be unique if provided       |
| Phone      | No       | Contact information              |
| Role       | Yes      | Determines permissions           |
| PIN        | Yes      | 4-6 digits, staff authentication |

## Staff Roles and Permissions

### Reception Staff

**Primary Responsibilities**: Customer service, order management, table coordination

**Permissions**:

- ✅ Create and manage orders
- ✅ View and update table status
- ✅ Access customer information
- ✅ Process payments and generate receipts
- ✅ Handle customer inquiries
- ❌ Access kitchen inventory
- ❌ View financial reports
- ❌ Manage bar inventory

### Kitchen Staff

**Primary Responsibilities**: Food preparation, kitchen operations

**Permissions**:

- ✅ View kitchen orders and preparation queue
- ✅ Update order status (in-preparation, ready, completed)
- ✅ Manage kitchen inventory
- ✅ Create low stock alerts
- ✅ View preparation times and special instructions
- ❌ Process payments
- ❌ Access customer personal information
- ❌ View financial reports

### Bar Staff

**Primary Responsibilities**: Beverage preparation, bar operations

**Permissions**:

- ✅ View beverage orders
- ✅ Update drink preparation status
- ✅ Manage bar inventory
- ✅ Create restock requests
- ✅ Track beverage usage
- ❌ Access food orders
- ❌ Process payments
- ❌ View financial reports

### Accountant Staff

**Primary Responsibilities**: Financial management, reporting

**Permissions**:

- ✅ View financial reports and analytics
- ✅ Access transaction history
- ✅ Process refunds and handle disputes
- ✅ Generate daily, weekly, monthly reports
- ✅ Manage payment processing
- ❌ Create or modify orders
- ❌ Access inventory management
- ❌ Manage tables or customer service

## Staff Sign-In Management

### Signing In Staff Members

1. **Access Sign-In Interface**

   - From your dashboard, locate "Staff Sign-In" section
   - View list of available staff members

2. **Select Staff Member**

   - Click on the staff member you want to sign in
   - Staff member must be present and ready to work

3. **Enter Staff PIN**

   - Input the staff member's PIN
   - PIN is masked for security
   - Click "Sign In"

4. **Confirm Sign-In**
   - Staff member will be marked as "Active"
   - Session timer begins (8-hour maximum)
   - Staff can now access their role-specific dashboard

### Managing Active Sessions

**View Active Staff**:

- Dashboard shows all currently signed-in staff
- Displays sign-in time and session duration
- Shows last activity timestamp

**Individual Sign-Out**:

- Click "Sign Out" next to staff member name
- Confirms sign-out action
- Immediately terminates staff session

**Bulk Sign-Out**:

- Use "Sign Out All Staff" for shift changes
- Confirms action before proceeding
- Terminates all active staff sessions

### Session Management Rules

- **Session Duration**: Maximum 8 hours
- **Auto Sign-Out**: Sessions expire automatically
- **Inactivity**: 30 minutes of inactivity triggers warning
- **Manual Override**: Business owners can terminate any session

## Session Monitoring

### Activity Tracking

**Real-Time Monitoring**:

- View current staff activity
- See last action performed
- Monitor session duration

**Activity Logs**:

- Track staff actions and page visits
- Monitor system usage patterns
- Generate activity reports

### Session Analytics

**Daily Reports**:

- Staff attendance tracking
- Session duration analysis
- Activity summaries

**Weekly/Monthly Insights**:

- Staff productivity metrics
- System usage patterns
- Operational efficiency data

## Staff Management Operations

### Editing Staff Information

1. Navigate to Staff → Staff List
2. Click "Edit" next to staff member
3. Modify allowed fields:
   - Name and contact information
   - Role (requires admin PIN)
   - Active/inactive status
4. Save changes

### Resetting Staff PINs

**When to Reset**:

- Staff member forgets PIN
- Security concerns
- Regular security maintenance

**Reset Process**:

1. Go to Staff → Staff List
2. Click "Reset PIN" for staff member
3. Enter admin PIN for verification
4. Generate new PIN
5. Securely share new PIN with staff

### Deactivating Staff Members

**Temporary Deactivation**:

- Set staff status to "Inactive"
- Prevents sign-in without deleting data
- Can be reactivated later

**Permanent Removal**:

- Use "Delete Staff Member" option
- Requires admin PIN confirmation
- Permanently removes staff data

## Security Best Practices

### PIN Management

**Staff PINs**:

- Use unique PINs for each staff member
- Change PINs regularly (monthly recommended)
- Never share PINs between staff members
- Use 6-digit PINs for enhanced security

**Admin PIN**:

- Keep admin PIN confidential
- Change regularly (quarterly recommended)
- Use different PIN from staff PINs
- Don't write down or store insecurely

### Session Security

**Best Practices**:

- Sign out staff at end of shifts
- Monitor for unusual activity
- Use bulk sign-out for shift changes
- Regularly review session logs

**Security Monitoring**:

- Check for failed login attempts
- Monitor after-hours access
- Review permission usage patterns
- Investigate suspicious activity

### Access Control

**Role Assignment**:

- Assign minimum necessary permissions
- Review roles quarterly
- Update permissions as duties change
- Document role assignments

**Permission Auditing**:

- Regular permission reviews
- Monitor cross-role access attempts
- Update permissions based on business needs
- Maintain principle of least privilege

## Common Workflows

### Opening Shift

1. Sign in reception staff first
2. Sign in kitchen staff for food prep
3. Sign in bar staff if serving beverages
4. Monitor initial setup activities

### Shift Changes

1. Use bulk sign-out for departing staff
2. Sign in new shift staff
3. Verify handover completion
4. Check for any pending tasks

### Closing Shift

1. Complete all pending orders
2. Process end-of-day reports (accountant)
3. Sign out all staff
4. Review daily activity summary

### Emergency Procedures

1. Use bulk sign-out for immediate staff removal
2. Reset PINs if security is compromised
3. Review activity logs for issues
4. Contact support if system problems occur

## Support and Maintenance

### Regular Maintenance

- Weekly: Review active sessions and activity
- Monthly: Update staff PINs and review roles
- Quarterly: Audit permissions and access patterns
- Annually: Complete security review

### Getting Help

- Check troubleshooting guide for common issues
- Review activity logs for error patterns
- Contact system administrator for technical issues
- Document any recurring problems for resolution
