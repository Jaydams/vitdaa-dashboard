"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  category: string;
  last_updated: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onInventoryUpdate: (itemId: string, newStock: number) => void;
}

export default function InventoryManager({
  inventory,
  onInventoryUpdate,
}: InventoryManagerProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Setup real-time subscription for inventory updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('inventory-manager-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_items',
      }, (payload) => {
        console.log('Inventory realtime change:', payload);
        // The parent component will handle the data refresh
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_alerts',
      }, (payload) => {
        console.log('Inventory alerts realtime change:', payload);
        // The parent component will handle the data refresh
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item.id);
    setEditValue(item.current_stock);
  };

  const handleSave = (itemId: string) => {
    if (editValue < 0) {
      toast.error("Stock cannot be negative");
      return;
    }
    
    onInventoryUpdate(itemId, editValue);
    setEditingItem(null);
    setEditValue(0);
    toast.success("Inventory updated successfully");
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditValue(0);
  };

  const handleQuickAdjust = (itemId: string, adjustment: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const newStock = item.current_stock + adjustment;
    if (newStock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }
    
    onInventoryUpdate(itemId, newStock);
    toast.success(`Stock ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800 border-green-200";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "out_of_stock":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock":
        return <CheckCircle className="h-4 w-4" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "out_of_stock":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {inventory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Category: {item.category}</p>
                  <p>Minimum Stock: {item.minimum_stock} {item.unit}</p>
                  <p>Last Updated: {new Date(item.last_updated).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingItem === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      className="w-20"
                      min="0"
                    />
                    <span className="text-sm text-gray-600">{item.unit}</span>
                    <Button
                      size="sm"
                      onClick={() => handleSave(item.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {item.current_stock} {item.unit}
                      </div>
                      <div className="text-sm text-gray-600">Current Stock</div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickAdjust(item.id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickAdjust(item.id, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
