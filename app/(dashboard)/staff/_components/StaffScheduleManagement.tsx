"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameDay,
  parseISO,
} from "date-fns";
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Staff,
  StaffShift,
  ShiftStatus,
  AttendanceStatus,
} from "@/types/staff";
import {
  useStaffShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useStartShift,
  useEndShift,
  useStaffAttendance,
  useAttendanceSummary,
  useCreateAttendance,
} from "@/hooks/useStaffShifts";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const shiftFormSchema = z.object({
  shift_date: z.string().min(1, "Date is required"),
  scheduled_start_time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  scheduled_end_time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  break_duration_minutes: z.number().min(0).max(480).optional(),
  notes: z.string().optional(),
});

const attendanceFormSchema = z.object({
  attendance_date: z.string().min(1, "Date is required"),
  clock_in_time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
    .optional(),
  clock_out_time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
    .optional(),
  status: z.enum(["present", "absent", "late", "early_departure"]),
  notes: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;
type AttendanceFormData = z.infer<typeof attendanceFormSchema>;

interface StaffScheduleManagementProps {
  staffId: string;
  staff: Staff;
}

export default function StaffScheduleManagement({
  staffId,
  staff,
}: StaffScheduleManagementProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);

  // Calculate date ranges based on view mode
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === "week") {
      return {
        startDate: format(
          startOfWeek(currentDate, { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        ),
        endDate: format(
          endOfWeek(currentDate, { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        ),
      };
    } else {
      return {
        startDate: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        endDate: format(endOfMonth(currentDate), "yyyy-MM-dd"),
      };
    }
  }, [currentDate, viewMode]);

  // Hooks for data fetching and mutations
  const {
    data: shifts = [],
    isLoading: shiftsLoading,
    error: shiftsError,
  } = useStaffShifts(staffId, startDate, endDate);
  const { data: attendance = [], isLoading: attendanceLoading } =
    useStaffAttendance(staffId, startDate, endDate);
  const { data: attendanceSummary, isLoading: summaryLoading } =
    useAttendanceSummary(staffId, startDate, endDate);

  const createShiftMutation = useCreateShift(staffId);
  const updateShiftMutation = useUpdateShift(staffId);
  const deleteShiftMutation = useDeleteShift(staffId);
  const startShiftMutation = useStartShift(staffId);
  const endShiftMutation = useEndShift(staffId);
  const createAttendanceMutation = useCreateAttendance(staffId);

  // Form setup
  const shiftForm = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      shift_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_start_time: "09:00",
      scheduled_end_time: "17:00",
      break_duration_minutes: 30,
      notes: "",
    },
  });

  const attendanceForm = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      attendance_date: format(new Date(), "yyyy-MM-dd"),
      status: "present",
      notes: "",
    },
  });

  // Navigation functions
  const navigatePrevious = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  // Form handlers
  const handleCreateShift = async (data: ShiftFormData) => {
    try {
      await createShiftMutation.mutateAsync(data);
      setIsShiftDialogOpen(false);
      shiftForm.reset();
    } catch (error) {
      console.error("Failed to create shift:", error);
    }
  };

  const handleUpdateShift = async (data: ShiftFormData) => {
    if (!editingShift) return;

    try {
      await updateShiftMutation.mutateAsync({
        shiftId: editingShift.id,
        updates: data,
      });
      setIsShiftDialogOpen(false);
      setEditingShift(null);
      shiftForm.reset();
    } catch (error) {
      console.error("Failed to update shift:", error);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
      await deleteShiftMutation.mutateAsync(shiftId);
    } catch (error) {
      console.error("Failed to delete shift:", error);
    }
  };

  const handleStartShift = async (shiftId: string) => {
    try {
      await startShiftMutation.mutateAsync({ shiftId });
    } catch (error) {
      console.error("Failed to start shift:", error);
    }
  };

  const handleEndShift = async (shiftId: string) => {
    try {
      await endShiftMutation.mutateAsync({ shiftId });
    } catch (error) {
      console.error("Failed to end shift:", error);
    }
  };

  const handleCreateAttendance = async (data: AttendanceFormData) => {
    try {
      await createAttendanceMutation.mutateAsync(data);
      setIsAttendanceDialogOpen(false);
      attendanceForm.reset();
    } catch (error) {
      console.error("Failed to create attendance record:", error);
    }
  };

  const openEditShift = (shift: StaffShift) => {
    setEditingShift(shift);
    shiftForm.reset({
      shift_date: shift.shift_date,
      scheduled_start_time: shift.scheduled_start_time,
      scheduled_end_time: shift.scheduled_end_time,
      break_duration_minutes: shift.break_duration_minutes,
      notes: shift.notes || "",
    });
    setIsShiftDialogOpen(true);
  };

  const getShiftStatusColor = (status: ShiftStatus) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "missed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAttendanceStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "early_departure":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Generate calendar days for the current view
  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const days = [];
      let current = start;
      while (current <= end) {
        days.push(current);
        current = addDays(current, 1);
      }
      return days;
    }
  }, [currentDate, viewMode]);

  if (shiftsError) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Failed to load schedule data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Schedule Management
          </h2>
          <p className="text-gray-600">
            Manage shifts and attendance for {staff.first_name}{" "}
            {staff.last_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? "Edit Shift" : "Create New Shift"}
                </DialogTitle>
              </DialogHeader>
              <Form {...shiftForm}>
                <form
                  onSubmit={shiftForm.handleSubmit(
                    editingShift ? handleUpdateShift : handleCreateShift
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={shiftForm.control}
                    name="shift_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={shiftForm.control}
                      name="scheduled_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={shiftForm.control}
                      name="scheduled_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={shiftForm.control}
                    name="break_duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Break Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="480"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={shiftForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsShiftDialogOpen(false);
                        setEditingShift(null);
                        shiftForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createShiftMutation.isPending ||
                        updateShiftMutation.isPending
                      }
                    >
                      {editingShift ? "Update" : "Create"} Shift
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isAttendanceDialogOpen}
            onOpenChange={setIsAttendanceDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Add Attendance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Attendance</DialogTitle>
              </DialogHeader>
              <Form {...attendanceForm}>
                <form
                  onSubmit={attendanceForm.handleSubmit(handleCreateAttendance)}
                  className="space-y-4"
                >
                  <FormField
                    control={attendanceForm.control}
                    name="attendance_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={attendanceForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="early_departure">
                              Early Departure
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={attendanceForm.control}
                      name="clock_in_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clock In Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={attendanceForm.control}
                      name="clock_out_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clock Out Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={attendanceForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAttendanceDialogOpen(false);
                        attendanceForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAttendanceMutation.isPending}
                    >
                      Record Attendance
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Tracking</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={navigatePrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {viewMode === "week"
                  ? `Week of ${format(
                      startOfWeek(currentDate, { weekStartsOn: 1 }),
                      "MMM d, yyyy"
                    )}`
                  : format(currentDate, "MMMM yyyy")}
              </h3>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          {shiftsLoading ? (
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: viewMode === "week" ? 7 : 30 }).map(
                (_, i) => (
                  <Skeleton key={i} className="h-32" />
                )
              )}
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                viewMode === "week" ? "grid-cols-7" : "grid-cols-7"
              }`}
            >
              {calendarDays.map((day) => {
                const dayShifts = shifts.filter((shift) =>
                  isSameDay(parseISO(shift.shift_date), day)
                );
                const dayAttendance = attendance.find((att) =>
                  isSameDay(parseISO(att.attendance_date), day)
                );

                return (
                  <Card key={day.toISOString()} className="min-h-32">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {format(day, "EEE d")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="p-2 rounded-md border bg-gray-50 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              className={`text-xs ${getShiftStatusColor(
                                shift.status
                              )}`}
                            >
                              {shift.status}
                            </Badge>
                            <div className="flex gap-1">
                              {shift.status === "scheduled" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleStartShift(shift.id)}
                                  disabled={startShiftMutation.isPending}
                                >
                                  <Play className="w-3 h-3" />
                                </Button>
                              )}
                              {shift.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleEndShift(shift.id)}
                                  disabled={endShiftMutation.isPending}
                                >
                                  <Square className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => openEditShift(shift)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleDeleteShift(shift.id)}
                                disabled={deleteShiftMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-gray-600">
                            {shift.scheduled_start_time} -{" "}
                            {shift.scheduled_end_time}
                          </div>
                          {shift.actual_start_time && (
                            <div className="text-green-600 text-xs">
                              Started: {shift.actual_start_time}
                            </div>
                          )}
                          {shift.actual_end_time && (
                            <div className="text-gray-600 text-xs">
                              Ended: {shift.actual_end_time}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayAttendance && (
                        <div className="p-2 rounded-md border bg-blue-50 text-xs">
                          <Badge
                            className={`text-xs ${getAttendanceStatusColor(
                              dayAttendance.status
                            )}`}
                          >
                            {dayAttendance.status}
                          </Badge>
                          {dayAttendance.total_hours_worked && (
                            <div className="text-gray-600 mt-1">
                              {dayAttendance.total_hours_worked.toFixed(1)}h
                              worked
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          {attendanceLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {attendance.map((record) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {format(
                              parseISO(record.attendance_date),
                              "MMM d, yyyy"
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {record.clock_in_time && (
                              <span>
                                In:{" "}
                                {format(
                                  parseISO(record.clock_in_time),
                                  "HH:mm"
                                )}
                              </span>
                            )}
                            {record.clock_out_time && (
                              <span>
                                Out:{" "}
                                {format(
                                  parseISO(record.clock_out_time),
                                  "HH:mm"
                                )}
                              </span>
                            )}
                            {record.total_hours_worked && (
                              <span>
                                ({record.total_hours_worked.toFixed(1)}h)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={getAttendanceStatusColor(record.status)}
                        >
                          {record.status}
                        </Badge>
                        {record.overtime_hours > 0 && (
                          <Badge variant="outline">
                            +{record.overtime_hours.toFixed(1)}h OT
                          </Badge>
                        )}
                      </div>
                    </div>
                    {record.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        {record.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          {summaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : attendanceSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Days Worked</p>
                      <p className="text-2xl font-semibold">
                        {attendanceSummary.total_days_worked}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Hours Worked</p>
                      <p className="text-2xl font-semibold">
                        {attendanceSummary.total_hours_worked.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Overtime Hours</p>
                      <p className="text-2xl font-semibold">
                        {attendanceSummary.total_overtime_hours.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Punctuality</p>
                      <p className="text-2xl font-semibold">
                        {attendanceSummary.punctuality_score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {attendanceSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Absences</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-red-600">
                    {attendanceSummary.absence_count}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Late Arrivals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {attendanceSummary.late_count}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Early Departures</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-orange-600">
                    {attendanceSummary.early_departure_count}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
