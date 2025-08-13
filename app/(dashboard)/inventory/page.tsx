import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getInventoryStats, getLowStockItems, getExpiringItems } from "@/data/inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Plus,
  AlertCircle,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { QuickActions } from "./_components/QuickActions";

async function InventoryStats({ businessId }: { businessId: string }) {
  const stats = await getInventoryStats(businessId);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalItems}</div>
          <p className="text-xs text-muted-foreground">
            Active inventory items
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
          <p className="text-xs text-muted-foreground">
            Items below minimum stock
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          <Clock className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.expiringItems}</div>
          <p className="text-xs text-muted-foreground">
            Items expiring in 7 days
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.activeAlerts}</div>
          <p className="text-xs text-muted-foreground">
            Unresolved alerts
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function LowStockItems({ businessId }: { businessId: string }) {
  const lowStockItems = await getLowStockItems(businessId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Low Stock Items
        </CardTitle>
        <CardDescription>
          Items that need immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No low stock items</p>
        ) : (
          <div className="space-y-3">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.current_stock} {item.unit_of_measure} remaining
                  </p>
                </div>
                <Badge variant="destructive">
                  {item.current_stock <= 0 ? "Out of Stock" : "Low Stock"}
                </Badge>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <Button variant="outline" className="w-full">
                View All ({lowStockItems.length} items)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function ExpiringItems({ businessId }: { businessId: string }) {
  const expiringItems = await getExpiringItems(businessId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-red-500" />
          Expiring Soon
        </CardTitle>
        <CardDescription>
          Items approaching expiration date
        </CardDescription>
      </CardHeader>
      <CardContent>
        {expiringItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items expiring soon</p>
        ) : (
          <div className="space-y-3">
            {expiringItems.slice(0, 5).map((item) => {
              const expiryDate = new Date(item.expiry_date);
              const today = new Date();
              const isExpired = expiryDate <= today;
              const isExpiringSoon = expiryDate <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
              
              return (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {expiryDate.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={isExpired ? 'destructive' : isExpiringSoon ? 'secondary' : 'default'}>
                    {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Expiring Later'}
                  </Badge>
                </div>
              );
            })}
            {expiringItems.length > 5 && (
              <Button variant="outline" className="w-full">
                View All ({expiringItems.length} items)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



export default async function InventoryDashboard() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { data: businessOwner } = await supabase
    .from("business_owner")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!businessOwner) {
    return <div>Business owner not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">
          Track and manage your inventory items, stock levels, and alerts.
        </p>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <InventoryStats businessId={businessOwner.id} />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<div>Loading low stock items...</div>}>
          <LowStockItems businessId={businessOwner.id} />
        </Suspense>
        
        <Suspense fallback={<div>Loading expiring items...</div>}>
          <ExpiringItems businessId={businessOwner.id} />
        </Suspense>
      </div>

      <QuickActions />
    </div>
  );
}
