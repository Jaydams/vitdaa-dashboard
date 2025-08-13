"use client";

import { ReactNode } from "react";
import { useStaffSession } from "@/hooks/useStaffSession";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";

/**
 * Interface for navigation item with permission requirements
 */
export interface NavigationItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children?: NavigationItem[];
}

/**
 * Props for NavigationGuard component
 */
interface NavigationGuardProps {
  navigationItems: NavigationItem[];
  children: (filteredItems: NavigationItem[]) => ReactNode;
  showUnauthorized?: boolean;
  unauthorizedFallback?: ReactNode;
}

/**
 * Component that filters navigation items based on user permissions
 * @param navigationItems - Array of navigation items to filter
 * @param children - Render function that receives filtered items
 * @param showUnauthorized - Whether to show items user doesn't have access to (disabled)
 * @param unauthorizedFallback - Fallback content for unauthorized items
 */
export function NavigationGuard({
  navigationItems,
  children,
  showUnauthorized = false,
  unauthorizedFallback,
}: NavigationGuardProps) {
  const { permissions: userPermissions, isLoading } = useStaffSession();

  // Show loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  /**
   * Check if user has access to a navigation item
   */
  const hasAccessToItem = (item: NavigationItem): boolean => {
    // If no permissions specified, item is accessible
    if (
      !item.permission &&
      (!item.permissions || item.permissions.length === 0)
    ) {
      return true;
    }

    // Check single permission
    if (item.permission) {
      return hasPermission(userPermissions, item.permission);
    }

    // Check multiple permissions
    if (item.permissions && item.permissions.length > 0) {
      return item.requireAll
        ? item.permissions.every((permission) =>
            hasPermission(userPermissions, permission)
          )
        : hasAnyPermission(userPermissions, item.permissions);
    }

    return true;
  };

  /**
   * Filter navigation items based on permissions
   */
  const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .map((item) => {
        const hasAccess = hasAccessToItem(item);

        // If showing unauthorized items, include them but mark as disabled
        if (!hasAccess && showUnauthorized) {
          return {
            ...item,
            disabled: true,
            children: item.children
              ? filterNavigationItems(item.children)
              : undefined,
          };
        }

        // If user has access, include the item
        if (hasAccess) {
          return {
            ...item,
            children: item.children
              ? filterNavigationItems(item.children)
              : undefined,
          };
        }

        // User doesn't have access and we're not showing unauthorized items
        return null;
      })
      .filter((item): item is NavigationItem => item !== null);
  };

  const filteredItems = filterNavigationItems(navigationItems);

  return <>{children(filteredItems)}</>;
}

/**
 * Hook for filtering navigation items based on permissions
 * @param navigationItems - Array of navigation items to filter
 * @returns Filtered navigation items
 */
export function useNavigationFilter(navigationItems: NavigationItem[]) {
  const { permissions: userPermissions, isLoading } = useStaffSession();

  const hasAccessToItem = (item: NavigationItem): boolean => {
    if (
      !item.permission &&
      (!item.permissions || item.permissions.length === 0)
    ) {
      return true;
    }

    if (item.permission) {
      return hasPermission(userPermissions, item.permission);
    }

    if (item.permissions && item.permissions.length > 0) {
      return item.requireAll
        ? item.permissions.every((permission) =>
            hasPermission(userPermissions, permission)
          )
        : hasAnyPermission(userPermissions, item.permissions);
    }

    return true;
  };

  const filterItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(hasAccessToItem).map((item) => ({
      ...item,
      children: item.children ? filterItems(item.children) : undefined,
    }));
  };

  return {
    filteredItems: isLoading ? [] : filterItems(navigationItems),
    isLoading,
    hasAccessToItem,
  };
}

/**
 * Component for rendering a single navigation item with permission check
 */
interface NavigationItemGuardProps {
  item: NavigationItem;
  children: (item: NavigationItem, hasAccess: boolean) => ReactNode;
  fallback?: ReactNode;
}

export function NavigationItemGuard({
  item,
  children,
  fallback = null,
}: NavigationItemGuardProps) {
  const { permissions: userPermissions } = useStaffSession();

  const hasAccess = (() => {
    if (
      !item.permission &&
      (!item.permissions || item.permissions.length === 0)
    ) {
      return true;
    }

    if (item.permission) {
      return hasPermission(userPermissions, item.permission);
    }

    if (item.permissions && item.permissions.length > 0) {
      return item.requireAll
        ? item.permissions.every((permission) =>
            hasPermission(userPermissions, permission)
          )
        : hasAnyPermission(userPermissions, item.permissions);
    }

    return true;
  })();

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children(item, hasAccess)}</>;
}

/**
 * Utility function to create role-based navigation items
 */
export function createRoleNavigation(role: string): NavigationItem[] {
  const baseNavItems: NavigationItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      url: "/staff/dashboard",
      icon: "dashboard",
    },
  ];

  const roleSpecificItems: Record<string, NavigationItem[]> = {
    reception: [
      {
        id: "orders",
        title: "Orders",
        url: "/staff/orders",
        icon: "orders",
        permission: "orders:read",
        children: [
          {
            id: "create-order",
            title: "Create Order",
            url: "/staff/orders/create",
            icon: "plus",
            permission: "orders:create",
          },
          {
            id: "order-history",
            title: "Order History",
            url: "/staff/orders/history",
            icon: "history",
            permission: "orders:read",
          },
        ],
      },
      {
        id: "tables",
        title: "Tables",
        url: "/staff/tables",
        icon: "tables",
        permission: "tables:read",
      },
      {
        id: "customers",
        title: "Customers",
        url: "/staff/customers",
        icon: "customers",
        permission: "customers:read",
      },
      {
        id: "payments",
        title: "Payments",
        url: "/staff/payments",
        icon: "payments",
        permission: "payments:process",
      },
    ],
    kitchen: [
      {
        id: "kitchen-orders",
        title: "Kitchen Orders",
        url: "/staff/kitchen/orders",
        icon: "orders",
        permission: "orders:read",
      },
      {
        id: "inventory",
        title: "Inventory",
        url: "/inventory",
        icon: "inventory",
        permission: "inventory:read",
        children: [
          {
            id: "inventory-dashboard",
            title: "Dashboard",
            url: "/inventory",
            icon: "dashboard",
            permission: "inventory:read",
          },
          {
            id: "inventory-items",
            title: "Items",
            url: "/inventory/items",
            icon: "package",
            permission: "inventory:read",
          },
          {
            id: "inventory-alerts",
            title: "Alerts",
            url: "/inventory/alerts",
            icon: "alert-triangle",
            permission: "inventory:alerts",
          },
          {
            id: "inventory-transactions",
            title: "Transactions",
            url: "/inventory/transactions",
            icon: "trending-up",
            permission: "inventory:read",
          },
        ],
      },
    ],
    bar: [
      {
        id: "bar-orders",
        title: "Bar Orders",
        url: "/staff/bar/orders",
        icon: "orders",
        permission: "orders:read",
      },
      {
        id: "inventory",
        title: "Inventory",
        url: "/inventory",
        icon: "inventory",
        permission: "inventory:read",
        children: [
          {
            id: "inventory-dashboard",
            title: "Dashboard",
            url: "/inventory",
            icon: "dashboard",
            permission: "inventory:read",
          },
          {
            id: "inventory-items",
            title: "Items",
            url: "/inventory/items",
            icon: "package",
            permission: "inventory:read",
          },
          {
            id: "inventory-alerts",
            title: "Alerts",
            url: "/inventory/alerts",
            icon: "alert-triangle",
            permission: "inventory:alerts",
          },
          {
            id: "inventory-transactions",
            title: "Transactions",
            url: "/inventory/transactions",
            icon: "trending-up",
            permission: "inventory:read",
          },
        ],
      },
    ],
    accountant: [
      {
        id: "reports",
        title: "Reports",
        url: "/staff/reports",
        icon: "reports",
        permission: "reports:read",
      },
      {
        id: "transactions",
        title: "Transactions",
        url: "/staff/transactions",
        icon: "transactions",
        permission: "transactions:read",
      },
      {
        id: "payments",
        title: "Payments",
        url: "/staff/payments",
        icon: "payments",
        permission: "payments:read",
      },
    ],
  };

  return [...baseNavItems, ...(roleSpecificItems[role] || [])];
}
