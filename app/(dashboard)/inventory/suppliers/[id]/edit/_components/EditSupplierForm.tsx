"use client";

import { useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateSupplier } from "@/data/inventory";
import { Supplier } from "@/data/inventory";
import { useRouter } from "next/navigation";

interface EditSupplierFormProps {
  supplier: Supplier;
  businessId: string;
}

export function EditSupplierForm({
  supplier,
  businessId,
}: EditSupplierFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state initialized with supplier data
  const [formData, setFormData] = useState({
    name: supplier.name || "",
    contact_person: supplier.contact_person || "",
    email: supplier.email || "",
    phone: supplier.phone || "",
    address: supplier.address || "",
    tax_id: supplier.tax_id || "",
    payment_terms: supplier.payment_terms || "",
    credit_limit: supplier.credit_limit?.toString() || "",
    rating: supplier.rating?.toString() || "",
    notes: supplier.notes || "",
    // Bank details
    bank_name: supplier.bank_name || "",
    account_number: supplier.account_number || "",
    account_name: supplier.account_name || "",
    routing_number: supplier.routing_number || "",
    swift_code: supplier.swift_code || "",
    bank_address: supplier.bank_address || "",
  });

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

      const result = await updateSupplier(supplier.id, formDataObj);

      if (result.success) {
        toast.success("Supplier updated successfully!");
        router.push(`/inventory/suppliers/${supplier.id}`);
      } else {
        toast.error(result.error || "Failed to update supplier");
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/inventory/suppliers/${supplier.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Details
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Supplier</h1>
            <p className="text-muted-foreground">Update supplier information</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edit Supplier: {supplier.name}
          </CardTitle>
          <CardDescription>
            Update supplier contact and banking details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Supplier Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., ABC Food Supplies"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      handleInputChange("contact_person", e.target.value)
                    }
                    placeholder="e.g., John Smith"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="supplier@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+234 123 456 7890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Full business address"
                  rows={2}
                />
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Details</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) =>
                      handleInputChange("tax_id", e.target.value)
                    }
                    placeholder="Tax identification number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) =>
                      handleInputChange("payment_terms", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_15">Net 15 days</SelectItem>
                      <SelectItem value="net_30">Net 30 days</SelectItem>
                      <SelectItem value="net_45">Net 45 days</SelectItem>
                      <SelectItem value="net_60">Net 60 days</SelectItem>
                      <SelectItem value="cod">Cash on Delivery</SelectItem>
                      <SelectItem value="prepaid">Prepaid</SelectItem>
                      <SelectItem value="custom">Custom Terms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Credit Limit (₦)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={(e) =>
                      handleInputChange("credit_limit", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(value) =>
                      handleInputChange("rating", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Banking Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Banking Information</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) =>
                      handleInputChange("bank_name", e.target.value)
                    }
                    placeholder="e.g., First Bank of Nigeria"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) =>
                      handleInputChange("account_name", e.target.value)
                    }
                    placeholder="Account holder name"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={formData.account_number}
                    onChange={(e) =>
                      handleInputChange("account_number", e.target.value)
                    }
                    placeholder="Bank account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routing_number">
                    Routing Number / Sort Code
                  </Label>
                  <Input
                    id="routing_number"
                    value={formData.routing_number}
                    onChange={(e) =>
                      handleInputChange("routing_number", e.target.value)
                    }
                    placeholder="Bank routing number"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="swift_code">
                    SWIFT Code (for international)
                  </Label>
                  <Input
                    id="swift_code"
                    value={formData.swift_code}
                    onChange={(e) =>
                      handleInputChange("swift_code", e.target.value)
                    }
                    placeholder="SWIFT/BIC code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_address">Bank Address</Label>
                  <Input
                    id="bank_address"
                    value={formData.bank_address}
                    onChange={(e) =>
                      handleInputChange("bank_address", e.target.value)
                    }
                    placeholder="Bank branch address"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about this supplier"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/inventory/suppliers/${supplier.id}`}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Supplier
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
