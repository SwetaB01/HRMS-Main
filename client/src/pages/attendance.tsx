import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Calendar, Clock, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Attendance as AttendanceType } from "@shared/schema";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const attendanceFormSchema = z.object({
  attendanceDate: z.string().min(1, "Date is required"),
  status: z.string().min(1, "Status is required"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
});

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceType | null>(null);
  const { toast } = useToast();

  const { data: attendanceRecords, isLoading } = useQuery<AttendanceType[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: todayStatus } = useQuery({
    queryKey: ["/api/attendance/today-status"],
  });

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      attendanceDate: new Date().toISOString().split('T')[0],
      status: "Present",
      checkIn: "",
      checkOut: "",
    },
  });

  const createAttendanceMutation = useMutation({
    mutationFn: async (data: AttendanceFormValues) => {
      const payload = {
        ...data,
        checkIn: data.checkIn ? new Date(`${data.attendanceDate}T${data.checkIn}:00`).toISOString() : null,
        checkOut: data.checkOut ? new Date(`${data.attendanceDate}T${data.checkOut}:00`).toISOString() : null,
      };

      const response = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create attendance');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today-status"] });
      setIsManualEntryOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Attendance record created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: AttendanceFormValues & { id: string }) => {
      const payload = {
        ...data,
        checkIn: data.checkIn ? new Date(`${data.attendanceDate}T${data.checkIn}:00`).toISOString() : null,
        checkOut: data.checkOut ? new Date(`${data.attendanceDate}T${data.checkOut}:00`).toISOString() : null,
      };

      const response = await fetch(`/api/attendance/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update attendance');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today-status"] });
      setIsManualEntryOpen(false);
      setEditingRecord(null);
      form.reset();
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AttendanceFormValues) => {
    if (editingRecord) {
      updateAttendanceMutation.mutate({ ...data, id: editingRecord.id });
    } else {
      createAttendanceMutation.mutate(data);
    }
  };

  const handleEdit = (record: AttendanceType) => {
    setEditingRecord(record);
    form.reset({
      attendanceDate: record.attendanceDate,
      status: record.status,
      checkIn: record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : "",
      checkOut: record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : "",
    });
    setIsManualEntryOpen(true);
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Checked in successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch('/api/attendance/check-out', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Checked out successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "Present": "default",
      "Absent": "destructive",
      "On Leave": "secondary",
      "Half Day": "secondary",
      "Work From Home": "default",
      "Work from Client Location": "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Attendance</h1>
          <p className="text-muted-foreground">
            Track your attendance and work hours. To apply for leave, go to the Leaves page.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isManualEntryOpen} onOpenChange={(open) => {
            setIsManualEntryOpen(open);
            if (!open) {
              setEditingRecord(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Edit Attendance" : "Add Manual Attendance"}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? "Update the attendance record" : "Manually add an attendance record"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="attendanceDate"
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
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Present">Present</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                            <SelectItem value="On Leave">On Leave</SelectItem>
                            <SelectItem value="Half Day">Half Day</SelectItem>
                            <SelectItem value="Work From Home">Work From Home</SelectItem>
                            <SelectItem value="Work from Client Location">Work from Client Location</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check In Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkOut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check Out Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsManualEntryOpen(false);
                        setEditingRecord(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAttendanceMutation.isPending || updateAttendanceMutation.isPending}>
                      {editingRecord ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check In</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-check-in-time">
              {todayStatus?.checkIn ? format(new Date(todayStatus.checkIn), 'HH:mm') : '--:--'}
            </div>
            <Button
              size="sm"
              className="mt-3"
              disabled={!!todayStatus?.checkIn}
              onClick={handleCheckIn}
              data-testid="button-check-in"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check In
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check Out</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-check-out-time">
              {todayStatus?.checkOut ? format(new Date(todayStatus.checkOut), 'HH:mm') : '--:--'}
            </div>
            <Button
              size="sm"
              className="mt-3"
              disabled={!todayStatus?.checkIn || !!todayStatus?.checkOut}
              onClick={handleCheckOut}
              data-testid="button-check-out"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-status">
              {todayStatus?.status || 'Not Marked'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Working hours: {todayStatus?.totalDuration || '0'} hrs
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : attendanceRecords && attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.attendanceDate}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>{record.totalDuration || '-'} hrs</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-regularize-${record.id}`}
                          >
                            Regularize
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}