"use client";

import React, { useState } from "react";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PinchZoomContainer,
  LongPressMenu,
  hapticFeedback,
} from "./MobileGestures";
import { TouchButton } from "./TouchOptimizedControls";
import { useResponsive } from "./ResponsiveDashboardProvider";
import { Badge } from "@/components/ui/badge";

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  currentPartySize?: number;
  customerName?: string;
  orderId?: string;
  reservationTime?: string;
  estimatedDuration?: number;
  position: {
    x: number;
    y: number;
  };
  shape: "round" | "square" | "rectangle";
}

interface MobileTableLayoutProps {
  tables: Table[];
  onTableSelect: (tableId: string) => void;
  onTableAssign: (tableId: string) => void;
  onTableClear: (tableId: string) => void;
  onTableReserve: (tableId: string) => void;
  className?: string;
}

export function MobileTableLayout({
  tables,
  onTableSelect,
  onTableAssign,
  onTableClear,
  onTableReserve,
  className,
}: MobileTableLayoutProps) {
  const { isMobile, isTouchDevice } = useResponsive();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-500 border-green-600";
      case "occupied":
        return "bg-red-500 border-red-600";
      case "reserved":
        return "bg-yellow-500 border-yellow-600";
      case "cleaning":
        return "bg-gray-500 border-gray-600";
      default:
        return "bg-gray-500 border-gray-600";
    }
  };

  const getStatusIcon = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-3 w-3" />;
      case "occupied":
        return <Users className="h-3 w-3" />;
      case "reserved":
        return <Clock className="h-3 w-3" />;
      case "cleaning":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getLongPressMenuItems = (table: Table) => {
    const items = [];

    if (table.status === "available") {
      items.push(
        {
          icon: <Users className="h-4 w-4" />,
          label: "Assign Customer",
          onClick: () => {
            onTableAssign(table.id);
            hapticFeedback.light();
          },
        },
        {
          icon: <Clock className="h-4 w-4" />,
          label: "Reserve Table",
          onClick: () => {
            onTableReserve(table.id);
            hapticFeedback.light();
          },
        }
      );
    }

    if (table.status === "occupied") {
      items.push({
        icon: <CheckCircle className="h-4 w-4" />,
        label: "Clear Table",
        onClick: () => {
          onTableClear(table.id);
          hapticFeedback.success();
        },
      });
    }

    return items;
  };

  const handleTableTap = (table: Table) => {
    setSelectedTable(table.id);
    onTableSelect(table.id);
    hapticFeedback.light();
  };

  const renderTable = (table: Table) => {
    const isSelected = selectedTable === table.id;

    return (
      <LongPressMenu key={table.id} menuItems={getLongPressMenuItems(table)}>
        <div
          className={cn(
            "absolute flex flex-col items-center justify-center",
            "border-2 rounded-lg shadow-sm transition-all duration-200",
            "cursor-pointer select-none",
            getStatusColor(table.status),
            isSelected && "ring-2 ring-blue-500 ring-offset-2",
            // Touch-optimized sizing
            isTouchDevice ? "min-w-16 min-h-16" : "min-w-12 min-h-12",
            // Shape-specific styling
            table.shape === "round" && "rounded-full",
            table.shape === "rectangle" && "aspect-[2/1]",
            table.shape === "square" && "aspect-square"
          )}
          style={{
            left: `${table.position.x}%`,
            top: `${table.position.y}%`,
            width: isTouchDevice ? "64px" : "48px",
            height:
              table.shape === "rectangle"
                ? isTouchDevice
                  ? "32px"
                  : "24px"
                : isTouchDevice
                ? "64px"
                : "48px",
          }}
          onClick={() => handleTableTap(table)}
        >
          {/* Table number */}
          <span
            className={cn(
              "font-bold text-white",
              isTouchDevice ? "text-sm" : "text-xs"
            )}
          >
            {table.number}
          </span>

          {/* Status icon */}
          <div className="text-white opacity-80">
            {getStatusIcon(table.status)}
          </div>

          {/* Capacity indicator */}
          <span
            className={cn(
              "text-white opacity-60",
              isTouchDevice ? "text-xs" : "text-[10px]"
            )}
          >
            {table.currentPartySize || 0}/{table.capacity}
          </span>
        </div>
      </LongPressMenu>
    );
  };

  const renderTableDetails = () => {
    const table = tables.find((t) => t.id === selectedTable);
    if (!table) return null;

    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Table {table.number}</h3>
          <Badge className={getStatusColor(table.status) + " text-white"}>
            {table.status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Capacity:</span>
            <span>{table.capacity} guests</span>
          </div>

          {table.currentPartySize && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Party:</span>
              <span>{table.currentPartySize} guests</span>
            </div>
          )}

          {table.customerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span>{table.customerName}</span>
            </div>
          )}

          {table.reservationTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reserved:</span>
              <span>
                {new Date(table.reservationTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {table.status === "available" && (
            <>
              <TouchButton
                className="flex-1"
                onClick={() => onTableAssign(table.id)}
              >
                <Users className="h-4 w-4 mr-2" />
                Assign
              </TouchButton>
              <TouchButton
                variant="outline"
                className="flex-1"
                onClick={() => onTableReserve(table.id)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Reserve
              </TouchButton>
            </>
          )}

          {table.status === "occupied" && (
            <TouchButton
              className="flex-1"
              onClick={() => onTableClear(table.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Clear Table
            </TouchButton>
          )}
        </div>
      </div>
    );
  };

  if (!isMobile) {
    // Desktop fallback - simple grid layout
    return (
      <div className={cn("grid grid-cols-4 gap-4", className)}>
        {tables.map((table) => (
          <div
            key={table.id}
            className={cn(
              "p-4 rounded-lg border text-center cursor-pointer",
              getStatusColor(table.status),
              "text-white"
            )}
            onClick={() => handleTableTap(table)}
          >
            <div className="font-bold">Table {table.number}</div>
            <div className="text-sm opacity-80">{table.status}</div>
            <div className="text-xs opacity-60">
              {table.currentPartySize || 0}/{table.capacity}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Instructions */}
      <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">Table Layout Controls:</p>
        <div className="space-y-1">
          <p>• Tap table → Select & view details</p>
          <p>• Long press → Quick actions menu</p>
          <p>• Pinch → Zoom in/out</p>
        </div>
      </div>

      {/* Selected table details */}
      {renderTableDetails()}

      {/* Table layout with pinch-to-zoom */}
      <PinchZoomContainer className="relative bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 min-h-96">
        <div className="relative w-full h-96">
          {/* Restaurant layout background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg" />

          {/* Tables */}
          {tables.map(renderTable)}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
            <div className="text-xs font-medium mb-2">Status Legend:</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span>Cleaning</span>
              </div>
            </div>
          </div>
        </div>
      </PinchZoomContainer>
    </div>
  );
}
