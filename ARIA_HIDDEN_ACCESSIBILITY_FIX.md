# Aria-Hidden Accessibility Fix

## Issue

The browser was showing an accessibility warning:

```
Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users.
```

This occurred when dropdown menus (DropdownMenu components) were opened, specifically in the orders table where download options are provided.

## Root Cause

The issue was caused by nesting a Tooltip component around a DropdownMenuTrigger. When the dropdown opened, the tooltip's content wrapper would have `aria-hidden="true"` while the dropdown button inside it retained focus, creating an accessibility conflict.

## Solution

Removed the nested Tooltip wrapper from the dropdown trigger in the orders table and replaced it with a simple `title` attribute for the same accessibility benefit without the aria-hidden conflict.

### Changes Made

1. **Orders Table Columns** (`app/(dashboard)/orders/_components/orders-table/columns.tsx`)
   - Removed the Tooltip wrapper around the DropdownMenuTrigger
   - Added `title="Download Options"` attribute to the Button for accessibility
   - This provides the same user experience without the aria-hidden conflict

## Technical Details

- Radix UI components (DropdownMenu, Select, etc.) automatically manage aria-hidden states
- Nesting interactive components with their own aria-hidden management can create conflicts
- Using native HTML attributes like `title` is often simpler and more reliable for basic tooltips

## Testing

- The dropdown functionality remains unchanged
- Accessibility warnings should no longer appear in the browser console
- Screen readers can still access the button and understand its purpose through the title attribute

## Best Practices

- Avoid nesting Tooltip components around other interactive components that manage their own accessibility states
- Use native HTML attributes when possible for simple accessibility needs
- Test with screen readers to ensure accessibility improvements don't break functionality
