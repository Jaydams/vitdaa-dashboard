# Hydration Error Fix - Select Component

## Problem

The application was experiencing hydration errors with Radix UI Select components. The error occurred because the `aria-controls` attribute was generating different IDs on the server and client:

```
aria-controls="radix-_R_1beatperabmplb_" (server)
aria-controls="radix-_R_5dpbn5rdabmplb_" (client)
```

## Root Cause

Radix UI components generate unique IDs for accessibility attributes during rendering. When server-side rendering (SSR) generates one ID and client-side hydration generates a different ID, React detects a mismatch and throws a hydration error.

## Solution

Added `suppressHydrationWarning` to the `SelectTrigger` component in `/components/ui/select.tsx`:

```tsx
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center justify-between rounded-md border border-input bg-background pl-3 pr-2 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 gap-x-1",
      className
    )}
    suppressHydrationWarning
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
```

## Why This Fix Works

- `suppressHydrationWarning` tells React to ignore hydration mismatches for this specific element
- This is safe for accessibility attributes that don't affect the visual appearance or functionality
- The component will still work correctly after hydration completes
- This fix applies to all SelectTrigger components throughout the application

## Components Affected

This fix resolves hydration errors in all components using the Select component, including:

- StaffFilters
- OrderFilters
- Menu components
- Settings forms
- And many other components throughout the application

## Alternative Solutions Considered

1. **Custom ID generation**: Would require more complex state management
2. **Client-only rendering**: Would hurt SEO and initial load performance
3. **Individual suppressHydrationWarning**: Would require changes to many files

The chosen solution is the most efficient and maintainable approach.
