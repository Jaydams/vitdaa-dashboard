import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Plus,
  BarChart3
} from "lucide-react";
import Link from "next/link";

async function InventorySidebar() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: businessOwner } = await supabase
    .from("business_owner")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!businessOwner) {
    return null;
  }

  const navigationItems = [
    {
      title: "Dashboard",
      href: "/inventory",
      icon: BarChart3,
      description: "Overview and statistics"
    },
    {
      title: "Items",
      href: "/inventory/items",
      icon: Package,
      description: "Manage inventory items"
    },
    {
      title: "Alerts",
      href: "/inventory/alerts",
      icon: AlertTriangle,
      description: "View and manage alerts"
    },
    {
      title: "Transactions",
      href: "/inventory/transactions",
      icon: TrendingUp,
      description: "Track inventory movements"
    },
  ];

  return (
    <div className="w-64 bg-background border-r min-h-screen p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Inventory Management</h2>
        <p className="text-sm text-muted-foreground">
          Track and manage your inventory
        </p>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <item.icon className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </Button>
          </Link>
        ))}
      </nav>

      <div className="mt-6 pt-6 border-t">
        <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Link href="/inventory/items/add">
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </Link>
          <Link href="/inventory/transactions/add">
            <Button variant="outline" size="sm" className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              Record Transaction
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Suspense fallback={<div className="w-64 bg-background border-r min-h-screen p-4">Loading...</div>}>
        <InventorySidebar />
      </Suspense>
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}
