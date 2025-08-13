import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchInventoryAlerts } from "@/data/inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock,
  Package,
  Calendar,
  TrendingUp,
  Eye
} from "lucide-react";
import Link from "next/link";
import { AlertFilters } from "./_components/AlertFilters";
import { ResolveAlertButton } from "./_components/ResolveAlertButton";

interface InventoryAlertsListProps {
  searchParams: {
    page?: string;
    resolved?: string;
    alertType?: string;
    severity?: string;
  };
}

async function InventoryAlertsList({ searchParams }: InventoryAlertsListProps) {
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

  const page = parseInt(searchParams.page || "1");
  const resolved = searchParams.resolved === "true" ? true : searchParams.resolved === "false" ? false : undefined;
  const alertType = searchParams.alertType || "";
  const severity = searchParams.severity || "";

  const alertsData = await fetchInventoryAlerts({
    page,
    perPage: 10,
    businessId: businessOwner.id,
    resolved,
  });

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'low_stock':
      case 'out_of_stock':
        return <Package className="h-4 w-4" />;
      case 'expiring_soon':
      case 'expired':
        return <Calendar className="h-4 w-4" />;
      case 'overstock':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'default';
      case 'low':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'expiring_soon':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      case 'overstock':
        return 'Overstock';
      case 'price_change':
        return 'Price Change';
      default:
        return alertType;
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Alerts</h1>
        <p className="text-muted-foreground">
          Monitor and manage inventory alerts and notifications
        </p>
      </div>

      {/* Filters */}
      <AlertFilters 
        resolved={resolved}
        alertType={alertType}
        severity={severity}
      />

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({alertsData.count})</CardTitle>
          <CardDescription>
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, alertsData.count)} of {alertsData.count} alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsData.data.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No alerts found</h3>
              <p className="text-muted-foreground">
                {resolved === false ? "No active alerts" : "No alerts match your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alertsData.data.map((alert) => (
                <div key={alert.id} className={`p-4 border rounded-lg ${alert.is_resolved ? 'bg-muted/50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${alert.is_resolved ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {alert.is_resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          getAlertIcon(alert.alert_type)
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">
                            {alert.item?.name || 'Unknown Item'}
                          </h3>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant={alert.is_resolved ? 'outline' : 'default'}>
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created: {new Date(alert.created_at).toLocaleDateString()}
                          </span>
                          {alert.is_resolved && alert.resolved_at && (
                            <span>
                              Resolved: {new Date(alert.resolved_at).toLocaleDateString()}
                            </span>
                          )}
                          {alert.item && (
                            <span>
                              Current Stock: {alert.item.current_stock} {alert.item.unit_of_measure}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {alert.item && (
                        <Link href={`/inventory/items/${alert.item.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      
                      {!alert.is_resolved && (
                        <ResolveAlertButton 
                          alertId={alert.id} 
                          userId={user.id} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {alertsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {alertsData.totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?${new URLSearchParams({ ...searchParams, page: (page - 1).toString() })}`}>
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < alertsData.totalPages && (
                  <Link href={`?${new URLSearchParams({ ...searchParams, page: (page + 1).toString() })}`}>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InventoryAlertsPage({ searchParams }: { searchParams: any }) {
  return (
    <Suspense fallback={<div>Loading alerts...</div>}>
      <InventoryAlertsList searchParams={searchParams} />
    </Suspense>
  );
}
