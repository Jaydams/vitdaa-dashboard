"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Star,
  Download,
} from "lucide-react";
import Link from "next/link";
import { AddSupplierModal } from "./AddSupplierModal";
import { fetchSuppliers } from "@/data/inventory";
import { toast } from "sonner";

interface SuppliersManagerProps {
  businessId: string;
}

export function SuppliersManager({ businessId }: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await fetchSuppliers({
        page,
        perPage: 10,
        businessId,
      });
      setSuppliers(data.data);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [page, businessId]);

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierRating = (rating: number | null) => {
    if (!rating) return "No rating";
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const exportSuppliers = () => {
    const csvContent = generateCSVContent(filteredSuppliers);
    downloadCSV(csvContent, "suppliers-list.csv");
    toast.success("Suppliers list exported successfully!");
  };

  const generateCSVContent = (suppliers: any[]) => {
    const headers = [
      "Name",
      "Contact Person",
      "Email",
      "Phone",
      "Address",
      "Tax ID",
      "Payment Terms",
      "Credit Limit",
      "Current Balance",
      "Rating",
      "Status",
    ];

    const rows = suppliers.map((supplier) => [
      supplier.name,
      supplier.contact_person || "",
      supplier.email || "",
      supplier.phone || "",
      supplier.address || "",
      supplier.tax_id || "",
      supplier.payment_terms || "",
      `₦${supplier.credit_limit || 0}`,
      `₦${supplier.current_balance || 0}`,
      supplier.rating || "No rating",
      supplier.is_active ? "Active" : "Inactive",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportSuppliers}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <AddSupplierModal
            businessId={businessId}
            onSupplierAdded={loadSuppliers}
          />
        </div>
      </div>

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Suppliers ({filteredSuppliers.length})
          </CardTitle>
          <CardDescription>
            Manage your suppliers and vendor relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No suppliers found</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No suppliers match your search"
                  : "Get started by adding your first supplier"}
              </p>
              {!searchTerm && (
                <AddSupplierModal
                  businessId={businessId}
                  onSupplierAdded={loadSuppliers}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{supplier.name}</h3>
                        {supplier.contact_person && (
                          <p className="text-sm text-muted-foreground">
                            Contact: {supplier.contact_person}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={supplier.is_active ? "default" : "secondary"}
                      >
                        {supplier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{supplier.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        {supplier.tax_id && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>Tax ID: {supplier.tax_id}</span>
                          </div>
                        )}
                        {supplier.payment_terms && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span>Terms: {supplier.payment_terms}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Rating:</span>
                          <div className="flex items-center gap-1">
                            {getSupplierRating(supplier.rating)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground">
                            Credit Limit:{" "}
                          </span>
                          <span className="font-medium">
                            ₦{supplier.credit_limit?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Balance:{" "}
                          </span>
                          <span
                            className={`font-medium ${
                              supplier.current_balance > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            ₦{supplier.current_balance?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/inventory/suppliers/${supplier.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/inventory/suppliers/${supplier.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                )}
                {page < totalPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
