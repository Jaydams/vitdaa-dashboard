"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Edit, X, Save } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types/order";

// Validation schema for order editing
const orderEditSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().min(1, "Customer phone is required"),
  customer_address: z.string().optional(),
  dining_option: z.enum(["indoor", "delivery"]),
  table_id: z.string().optional(),
  delivery_location_id: z.string().optional(),
  rider_name: z.string().optional(),
  rider_phone: z.string().optional(),
  notes: z.string().optional(),
});

type OrderEditFormData = z.infer<typeof orderEditSchema>;

interface Table {
  id: string;
  table_number: string;
  status: "available" | "reserved" | "occupied" | "inactive";
}

interface DeliveryLocation {
  id: string;
  name: string;
  price: number;
  status: "active" | "inactive" | "deleted";
}

interface OrderEditFormProps {
  order: Order;
  onSave: (data: OrderEditFormData) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export function OrderEditForm({
  order,
  onSave,
  onCancel,
  disabled = false,
}: OrderEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<
    DeliveryLocation[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<OrderEditFormData>({
    resolver: zodResolver(orderEditSchema),
    defaultValues: {
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address || "",
      dining_option: order.dining_option,
      table_id: order.table_id || "",
      delivery_location_id: order.delivery_location_id || "",
      rider_name: order.rider_name || "",
      rider_phone: order.rider_phone || "",
      notes: order.notes || "",
    },
  });

  const watchedDiningOption = form.watch("dining_option");

  // Determine which fields are editable based on order status
  const editableFields = useMemo(() => {
    const isEditable = !["delivered", "cancelled"].includes(order.status);

    return {
      customer_name: isEditable,
      customer_phone: isEditable,
      customer_address: isEditable,
      dining_option: isEditable && order.status === "pending", // Only allow changing dining option for pending orders
      table_id: isEditable,
      delivery_location_id: isEditable,
      rider_name: isEditable,
      rider_phone: isEditable,
      notes: isEditable,
    };
  }, [order.status]);

  // Fetch tables and delivery locations
  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch tables
        const { data: tablesData, error: tablesError } = await supabase
          .from("tables")
          .select("id, table_number, status")
          .eq("restaurant_id", order.business_id)
          .in("status", ["available", "occupied"]);

        if (tablesError) {
          console.error("Error fetching tables:", tablesError);
        } else {
          setTables(tablesData || []);
        }

        // Fetch delivery locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("delivery_locations")
          .select("id, name, price, status")
          .eq("business_id", order.business_id)
          .eq("status", "active");

        if (locationsError) {
          console.error("Error fetching delivery locations:", locationsError);
        } else {
          setDeliveryLocations(locationsData || []);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [order.business_id]);

  const handleSubmit = async (data: OrderEditFormData) => {
    if (disabled) return;

    setIsLoading(true);
    try {
      await onSave(data);
      toast.success("Order updated successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="size-5" />
            Edit Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2">Loading form data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="size-5" />
          Edit Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!editableFields.customer_name || disabled}
                          placeholder="Enter customer name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!editableFields.customer_phone || disabled}
                          placeholder="Enter customer phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customer_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={!editableFields.customer_address || disabled}
                        placeholder="Enter customer address"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Dining Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dining Information</h3>

              <FormField
                control={form.control}
                name="dining_option"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dining Option</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!editableFields.dining_option || disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dining option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="indoor">Indoor Dining</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedDiningOption === "indoor" && (
                <FormField
                  control={form.control}
                  name="table_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!editableFields.table_id || disabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select table" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tables.map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              Table {table.table_number}
                              {table.status === "occupied" &&
                                " (Currently Occupied)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedDiningOption === "delivery" && (
                <>
                  <FormField
                    control={form.control}
                    name="delivery_location_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Location</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={
                            !editableFields.delivery_location_id || disabled
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select delivery location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {deliveryLocations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name} (₦{location.price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rider_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rider Name (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!editableFields.rider_name || disabled}
                              placeholder="Enter rider name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rider_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rider Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!editableFields.rider_phone || disabled}
                              placeholder="Enter rider phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={!editableFields.notes || disabled}
                      placeholder="Add any special notes for this order"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="size-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  disabled ||
                  !Object.values(editableFields).some(Boolean)
                }
              >
                {isLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Save className="size-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
