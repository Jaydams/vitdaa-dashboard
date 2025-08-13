"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  LogIn,
  LogOut,
  Users,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

import {
  signInStaff,
  signOutStaff,
  bulkSignOutStaff,
} from "@/actions/auth-actions";
import { Staff } from "@/types/staff";
import { StaffSessionRecord } from "@/types/auth";

// Form validation schema
const signInSchema = z.object({
  staffId: z.string().min(1, "Please select a staff member"),
  pin: z
    .string()
    .min(4, "PIN must be at least 4 digits")
    .max(6, "PIN must be at most 6 digits"),
});

type SignInFormData = z.infer<typeof signInSchema>;

interface StaffSignInInterfaceProps {
  availableStaff: Staff[];
  activeStaffSessions: (StaffSessionRecord & { staff: Staff })[];
  businessOwnerId: string;
  onOpenCreateDialog?: () => void;
}

export default function StaffSignInInterface({
  availableStaff,
  activeStaffSessions,
  businessOwnerId,
  onOpenCreateDialog,
}: StaffSignInInterfaceProps) {
  const [isPending, startTransition] = useTransition();
  const [showPin, setShowPin] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      staffId: "",
      pin: "",
    },
  });

  const handleSignIn = (data: SignInFormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("staffId", data.staffId);
        formData.append("pin", data.pin);

        await signInStaff(formData);

        // Reset form on success
        form.reset();
      } catch (error) {
        console.error("Error signing in staff:", error);
      }
    });
  };

  const handleSignOut = (sessionId: string) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("sessionId", sessionId);

        await signOutStaff(formData);
      } catch (error) {
        console.error("Error signing out staff:", error);
      }
    });
  };

  const handleBulkSignOut = () => {
    if (selectedSessions.length === 0) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("sessionIds", JSON.stringify(selectedSessions));

        await bulkSignOutStaff(formData);
        setSelectedSessions([]);
      } catch (error) {
        console.error("Error bulk signing out staff:", error);
      }
    });
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSessions.length === activeStaffSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(activeStaffSessions.map((session) => session.id));
    }
  };

  // Filter available staff to exclude those already signed in
  const signedInStaffIds = activeStaffSessions.map(
    (session) => session.staff_id
  );
  const availableForSignIn = availableStaff.filter(
    (staff) => !signedInStaffIds.includes(staff.id) && staff.is_active
  );

  return (
    <div className="space-y-6">
      {/* Sign In Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LogIn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Sign In Staff
              </CardTitle>
              <CardDescription>
                Select a staff member and enter their PIN to sign them in
              </CardDescription>
            </div>
            {onOpenCreateDialog && (
              <Button
                onClick={onOpenCreateDialog}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {availableForSignIn.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
                All Staff Signed In
              </h3>
              <p className="text-sm mb-4">All active staff members are currently signed in</p>
              {onOpenCreateDialog && (
                <Button
                  onClick={onOpenCreateDialog}
                  variant="outline"
                  className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Staff Member
                </Button>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSignIn)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="staffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">Staff Member</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="border-2 focus:border-blue-500 dark:focus:border-blue-400">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableForSignIn.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                <div className="flex items-center gap-2">
                                  <span>
                                    {staff.first_name} {staff.last_name}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs capitalize bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  >
                                    {staff.role}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">Staff PIN</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPin ? "text" : "password"}
                              placeholder="Enter staff PIN"
                              {...field}
                              className="pr-10 border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                              onClick={() => setShowPin(!showPin)}
                            >
                              {showPin ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isPending} 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg border-0"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In Staff
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Active Staff Sessions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                Active Staff ({activeStaffSessions.length})
              </CardTitle>
              <CardDescription>
                Currently signed-in staff members
              </CardDescription>
            </div>
            {activeStaffSessions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={isPending}
                  className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {selectedSessions.length === activeStaffSessions.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                {selectedSessions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
                      >
                        Sign Out Selected ({selectedSessions.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Sign Out Multiple Staff
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to sign out{" "}
                          {selectedSessions.length} staff member(s)? This will
                          end their current sessions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleBulkSignOut}
                          className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                          Sign Out Selected
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeStaffSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                <Clock className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
                No Active Sessions
              </h3>
              <p className="text-sm">No staff members are currently signed in</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeStaffSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedSessions.includes(session.id)}
                      onCheckedChange={() => toggleSessionSelection(session.id)}
                      className="border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {session.staff.first_name.charAt(0)}
                          {session.staff.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {session.staff.first_name} {session.staff.last_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="text-xs capitalize bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
                            {session.staff.role}
                          </Badge>
                          <span className="text-gray-400">•</span>
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Signed in{" "}
                            {formatDistanceToNow(
                              new Date(session.signed_in_at),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isPending}
                        className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Sign Out Staff Member
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to sign out{" "}
                          {session.staff.first_name} {session.staff.last_name}?
                          This will end their current session.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleSignOut(session.id)}
                          className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                          Sign Out
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
