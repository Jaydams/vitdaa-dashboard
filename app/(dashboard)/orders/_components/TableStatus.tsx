"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTablesRealtime } from "@/hooks/useTablesRealtime";

export function TableStatus() {
  const { tables, loading, error } = useTablesRealtime();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "occupied":
        return "bg-red-100 text-red-800";
      case "reserved":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Table Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading tables...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Table Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex flex-col items-center p-4 border rounded-lg"
            >
              <div className="text-lg font-semibold">Table {table.table_number}</div>
              <div className="text-sm text-muted-foreground mb-2">
                Capacity: {table.capacity}
              </div>
              <Badge className={getStatusColor(table.status)}>
                {table.status}
              </Badge>
            </div>
          ))}
        </div>
        {tables.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No tables found
          </div>
        )}
      </CardContent>
    </Card>
  );
} 