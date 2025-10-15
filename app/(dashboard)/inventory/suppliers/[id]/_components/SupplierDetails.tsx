"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Edit,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Star,
  ArrowLeft,
  Banknote,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Supplier } from "@/data/inventory";

interface SupplierDetailsProps {
  supplier: Supplier;
  businessId: string;
}

export function SupplierDetails({
  supplier,
  businessId,
}: SupplierDetailsProps) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory/suppliers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Suppliers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {supplier.name}
            </h1>
            <p className="text-muted-foreground">Supplier Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={supplier.is_active ? "default" : "secondary"}>
            {supplier.is_active ? "Active" : "Inactive"}
          </Badge>
          <Link href={`/inventory/suppliers/${supplier.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Supplier
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Supplier Name
              </label>
              <p className="text-lg font-medium">{supplier.name}</p>
            </div>

            {supplier.contact_person && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Contact Person
                </label>
                <p>{supplier.contact_person}</p>
              </div>
            )}

            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${supplier.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {supplier.email}
                </a>
              </div>
            )}

            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${supplier.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {supplier.phone}
                </a>
              </div>
            )}

            {supplier.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <p>{supplier.address}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Rating:
              </span>
              <div className="flex items-center gap-1">
                {getSupplierRating(supplier.rating || null)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.tax_id && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tax ID / VAT Number
                </label>
                <p>{supplier.tax_id}</p>
              </div>
            )}

            {supplier.payment_terms && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Payment Terms
                </label>
                <p className="capitalize">
                  {supplier.payment_terms.replace("_", " ")}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Credit Limit
              </label>
              <p className="text-lg font-medium">
                ₦{supplier.credit_limit?.toLocaleString() || 0}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Current Balance
              </label>
              <p
                className={`text-lg font-medium ${
                  supplier.current_balance > 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                ₦{supplier.current_balance?.toLocaleString() || 0}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Added on {formatDate(supplier.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Banking Information */}
        {(supplier.bank_name || supplier.account_number) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Banking Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.bank_name && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Bank Name
                  </label>
                  <p>{supplier.bank_name}</p>
                </div>
              )}

              {supplier.account_name && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Account Name
                  </label>
                  <p>{supplier.account_name}</p>
                </div>
              )}

              {supplier.account_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Account Number
                  </label>
                  <p className="font-mono">{supplier.account_number}</p>
                </div>
              )}

              {supplier.routing_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Routing Number / Sort Code
                  </label>
                  <p className="font-mono">{supplier.routing_number}</p>
                </div>
              )}

              {supplier.swift_code && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    SWIFT Code
                  </label>
                  <p className="font-mono">{supplier.swift_code}</p>
                </div>
              )}

              {supplier.bank_address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Bank Address
                  </label>
                  <p>{supplier.bank_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {supplier.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{supplier.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
