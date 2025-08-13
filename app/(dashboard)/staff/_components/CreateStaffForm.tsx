"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  User,
  Mail,
  Phone,
  Shield,
  Users,
  ChefHat,
  Wine,
  Calculator,
  CheckCircle,
  AlertCircle,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { createStaffForm } from "@/actions/auth-actions";
import { StaffRole } from "@/types/staff";
import { getPermissionsForRole } from "@/lib/client-permissions";


// Form validation schema
const createStaffSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  username: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  role: z.enum(["reception", "kitchen", "bar", "accountant", "storekeeper", "waiter"]),
});

type FormData = z.infer<typeof createStaffSchema>;

// Role descriptions and icons for better UX
const roleConfig = {
  reception: {
    description: "Manage orders, tables, customers, and process payments",
    icon: Users,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  kitchen: {
    description:
      "View orders, update preparation status, and manage kitchen inventory",
    icon: ChefHat,
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  bar: {
    description:
      "Handle beverage orders, update drink status, and manage bar inventory",
    icon: Wine,
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  accountant: {
    description: "Access financial reports, transactions, and manage payments",
    icon: Calculator,
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  storekeeper: {
    description:
      "Manage inventory, track stock levels, and handle supply orders",
    icon: Package,
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  waiter: {
    description:
      "Take orders, serve customers, and manage table service",
    icon: Users,
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
} as const;

interface CreateStaffFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateStaffForm({
  onSuccess,
  onCancel,
}: CreateStaffFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      phoneNumber: "",
      role: undefined,
    },
  });

  // Remove the duplicate form validation hook since we're using react-hook-form

  const handleSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("firstName", data.firstName);
        formData.append("lastName", data.lastName);
        formData.append("email", data.email);
        formData.append("username", data.username || "");
        formData.append("phoneNumber", data.phoneNumber || "");
        formData.append("role", data.role);

        const permissions = getPermissionsForRole(data.role);
        formData.append("permissions", JSON.stringify(permissions));

        const result = await createStaffForm(formData);

        // Show success toast with PIN
        toast.success("Staff member created successfully!", {
          description: `PIN: ${result.staff.pin} | Role: ${result.staff.role}`,
          duration: 10000, // Show for 10 seconds so user can copy PIN
        });

        // Reset form
        form.reset();
        setSelectedRole(null);

        // Call onSuccess callback to trigger refetch and close modal
        onSuccess?.();
      } catch (error) {
        console.error("Error creating staff:", error);
        toast.error("Failed to create staff member", {
          description:
            "Please try again or contact support if the issue persists.",
        });
      }
    });
  };

  const handleRoleChange = (role: StaffRole) => {
    setSelectedRole(role);
    form.setValue("role", role);
  };

  const rolePermissions = selectedRole
    ? getPermissionsForRole(selectedRole)
    : [];

  const getRoleIcon = (role: StaffRole) => {
    const IconComponent = roleConfig[role].icon;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <User className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Add New Staff Member
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Create a new staff account with role-based permissions and secure PIN
          access
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Personal Information Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Basic details for the new staff member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        First Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter first name"
                          {...field}
                          className="border-2 focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Last Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter last name"
                          {...field}
                          className="border-2 focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          {...field}
                          className="border-2 focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Username (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter username"
                          {...field}
                          className="border-2 focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter phone number"
                          {...field}
                          className="border-2 focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Role Selection Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
              <CardDescription>
                Select the appropriate role for this staff member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Staff Role *
                    </FormLabel>
                    <Select
                      onValueChange={handleRoleChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-2 focus:border-primary">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(roleConfig).map(([role, config]) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(role as StaffRole)}
                              <span className="capitalize">{role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole && (
                <div className="space-y-4">
                  <Separator />

                  {/* Role Description */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      {getRoleIcon(selectedRole)}
                      <Badge className={roleConfig[selectedRole].color}>
                        {selectedRole.charAt(0).toUpperCase() +
                          selectedRole.slice(1)}{" "}
                        Role
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {roleConfig[selectedRole].description}
                    </p>
                  </div>

                  {/* Permissions Display */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Label className="text-sm font-medium">
                        Assigned Permissions:
                      </Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rolePermissions.map((permission) => (
                        <Badge
                          key={permission}
                          variant="secondary"
                          className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        >
                          {permission.replace(":", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Security Notice
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    A secure 4-digit PIN will be automatically generated for
                    this staff member. The PIN will be displayed after
                    successful creation and should be shared securely.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Staff Member"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
