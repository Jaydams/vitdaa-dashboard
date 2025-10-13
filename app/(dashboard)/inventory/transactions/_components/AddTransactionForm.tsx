"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  recordInventoryTransaction,
  fetchInventoryItems,
  fetchSuppliers,
} from "@/data/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface AddTransactionFormProps {
  businessId: string;
}

export function AddTransactionForm({ businessId }: AddTransactionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    item_id: "",
    transaction_type: "",
    quantity: "",
    unit_cost: "",
    supplier_id: "",
    order_id: "",
    notes: "",
  });

  // Load items and suppliers
  useEffect(() => {
    const loadData = async () => {
      try {
        const itemsData = await fetchInventoryItems({
          page: 1,
          perPage: 100,
          businessId,
        });
        setItems(itemsData.data);

        const suppliersData = await fetchSuppliers({
          page: 1,
          perPage: 100,
          businessId,
        });
        setSuppliers(suppliersData.data);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formDataObj = new FormData();

      // Add all form fields to FormData
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== "") {
          formDataObj.append(key, value.toString());
        }
      });

      const result = await recordInventoryTransaction(formDataObj);

      if (result.success) {
        toast.success("Transaction recorded successfully!");
        router.push("/inventory/transactions");
      } else {
        toast.error(result.error || "Failed to record transaction");
      }
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getSelectedItem = () => {
    return items.find((item) => item.id === formData.item_id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item Selection */}
      <div className="space-y-2">
        <Label htmlFor="item_id">Inventory Item *</Label>
        <Select
          value={formData.item_id}
          onValueChange={(value) => handleInputChange("item_id", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an item" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} ({item.current_stock} {item.unit_of_measure})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Type */}
      <div className="space-y-2">
        <Label htmlFor="transaction_type">Transaction Type *</Label>
        <Select
          value={formData.transaction_type}
          onValueChange={(value) =>
            handleInputChange("transaction_type", value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select transaction type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="waste">Waste</SelectItem>
            <SelectItem value="transfer_in">Transfer In</SelectItem>
            <SelectItem value="transfer_out">Transfer Out</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="damage">Damage</SelectItem>
            <SelectItem value="expiry">Expiry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity and Cost */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            placeholder="0.00"
            required
          />
          {getSelectedItem() && (
            <p className="text-xs text-muted-foreground">
              Unit: {getSelectedItem().unit_of_measure}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit_cost">Unit Cost (₦) *</Label>
          <Input
            id="unit_cost"
            type="number"
            step="0.01"
            value={formData.unit_cost}
            onChange={(e) => handleInputChange("unit_cost", e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Supplier and Order */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplier_id">Supplier</Label>
          <Select
            value={formData.supplier_id}
            onValueChange={(value) => handleInputChange("supplier_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="order_id">Order ID</Label>
          <Input
            id="order_id"
            value={formData.order_id}
            onChange={(e) => handleInputChange("order_id", e.target.value)}
            placeholder="Optional order reference"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Additional notes about this transaction"
          rows={3}
        />
      </div>

      {/* Transaction Summary */}
      {formData.quantity && formData.unit_cost && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Transaction Summary</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Quantity:</span>
              <span>
                {formData.quantity} {getSelectedItem()?.unit_of_measure}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Unit Cost:</span>
              <span>₦{parseFloat(formData.unit_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Cost:</span>
              <span>
                ₦
                {(
                  parseFloat(formData.quantity) * parseFloat(formData.unit_cost)
                ).toFixed(2)}
              </span>
            </div>
            {getSelectedItem() && (
              <div className="flex justify-between">
                <span>Current Stock:</span>
                <span>
                  {getSelectedItem().current_stock}{" "}
                  {getSelectedItem().unit_of_measure}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push("/inventory/transactions")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Recording...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Record Transaction
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
