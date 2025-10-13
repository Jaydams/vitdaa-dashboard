"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchInventoryCategories, fetchSuppliers } from "@/data/inventory";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface EditItemFormProps {
  businessId: string;
  item: any;
}

export function EditItemForm({ businessId, item }: EditItemFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Form state initialized with existing item data
  const [formData, setFormData] = useState({
    name: item.name || "",
    description: item.description || "",
    sku: item.sku || "",
    barcode: item.barcode || "",
    category_id: item.category_id || "",
    supplier_id: item.supplier_id || "",
    unit_of_measure: item.unit_of_measure || "",
    minimum_stock: item.minimum_stock?.toString() || "",
    maximum_stock: item.maximum_stock?.toString() || "",
    reorder_point: item.reorder_point?.toString() || "",
    reorder_quantity: item.reorder_quantity?.toString() || "",
    unit_cost: item.unit_cost?.toString() || "",
    selling_price: item.selling_price?.toString() || "",
    location: item.location || "",
    expiry_date: item.expiry_date ? item.expiry_date.split("T")[0] : "",
    is_perishable: item.is_perishable || false,
    is_alcoholic: item.is_alcoholic || false,
    is_ingredient: item.is_ingredient || false,
  });

  // Load categories and suppliers
  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesData = await fetchInventoryCategories({
          page: 1,
          perPage: 100,
          businessId,
        });
        setCategories(categoriesData.data);

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
      const supabase = createClient();

      // Prepare update data
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        unit_of_measure: formData.unit_of_measure,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        maximum_stock: parseFloat(formData.maximum_stock) || null,
        reorder_point: parseFloat(formData.reorder_point) || null,
        reorder_quantity: parseFloat(formData.reorder_quantity) || null,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        selling_price: parseFloat(formData.selling_price) || null,
        location: formData.location || null,
        expiry_date: formData.expiry_date || null,
        is_perishable: formData.is_perishable,
        is_alcoholic: formData.is_alcoholic,
        is_ingredient: formData.is_ingredient,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", item.id)
        .eq("business_id", businessId);

      if (error) {
        console.error("Error updating inventory item:", error);
        toast.error("Failed to update inventory item");
        return;
      }

      toast.success("Inventory item updated successfully!");
      router.push(`/inventory/items/${item.id}`);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="e.g., Fresh Tomatoes"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => handleInputChange("sku", e.target.value)}
            placeholder="e.g., TOM-001"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Brief description of the item"
          rows={2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input
            id="barcode"
            value={formData.barcode}
            onChange={(e) => handleInputChange("barcode", e.target.value)}
            placeholder="Barcode number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Storage Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            placeholder="e.g., Refrigerator A, Shelf 3"
          />
        </div>
      </div>

      {/* Category and Supplier */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => handleInputChange("category_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <Select
            value={formData.supplier_id}
            onValueChange={(value) => handleInputChange("supplier_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Supplier</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stock and Pricing */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
          <Select
            value={formData.unit_of_measure}
            onValueChange={(value) =>
              handleInputChange("unit_of_measure", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pieces">Pieces</SelectItem>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="grams">Grams</SelectItem>
              <SelectItem value="liters">Liters</SelectItem>
              <SelectItem value="ml">Milliliters</SelectItem>
              <SelectItem value="boxes">Boxes</SelectItem>
              <SelectItem value="bottles">Bottles</SelectItem>
              <SelectItem value="cans">Cans</SelectItem>
              <SelectItem value="bags">Bags</SelectItem>
              <SelectItem value="packs">Packs</SelectItem>
              <SelectItem value="units">Units</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum_stock">Minimum Stock *</Label>
          <Input
            id="minimum_stock"
            type="number"
            value={formData.minimum_stock}
            onChange={(e) => handleInputChange("minimum_stock", e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maximum_stock">Maximum Stock</Label>
          <Input
            id="maximum_stock"
            type="number"
            value={formData.maximum_stock}
            onChange={(e) => handleInputChange("maximum_stock", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="reorder_point">Reorder Point</Label>
          <Input
            id="reorder_point"
            type="number"
            value={formData.reorder_point}
            onChange={(e) => handleInputChange("reorder_point", e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
          <Input
            id="reorder_quantity"
            type="number"
            value={formData.reorder_quantity}
            onChange={(e) =>
              handleInputChange("reorder_quantity", e.target.value)
            }
            placeholder="0"
          />
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

      <div className="space-y-2">
        <Label htmlFor="selling_price">Selling Price (₦)</Label>
        <Input
          id="selling_price"
          type="number"
          step="0.01"
          value={formData.selling_price}
          onChange={(e) => handleInputChange("selling_price", e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Expiry Date</Label>
        <Input
          id="expiry_date"
          type="date"
          value={formData.expiry_date}
          onChange={(e) => handleInputChange("expiry_date", e.target.value)}
        />
      </div>

      {/* Item Properties */}
      <div className="space-y-4">
        <Label>Item Properties</Label>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_perishable"
              checked={formData.is_perishable}
              onCheckedChange={(checked) =>
                handleInputChange("is_perishable", checked as boolean)
              }
            />
            <Label htmlFor="is_perishable">Perishable</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_alcoholic"
              checked={formData.is_alcoholic}
              onCheckedChange={(checked) =>
                handleInputChange("is_alcoholic", checked as boolean)
              }
            />
            <Label htmlFor="is_alcoholic">Alcoholic</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_ingredient"
              checked={formData.is_ingredient}
              onCheckedChange={(checked) =>
                handleInputChange("is_ingredient", checked as boolean)
              }
            />
            <Label htmlFor="is_ingredient">Used in Menu Items</Label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push(`/inventory/items/${item.id}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Updating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Update Item
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
