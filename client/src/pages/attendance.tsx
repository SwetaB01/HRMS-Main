import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Calendar, Clock, CheckCircle } from "lucide-react";
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
import { Attendance as AttendanceType } from "@shared/schema";
import { format } from "date-fns";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: attendanceRecords, isLoading } = useQuery<AttendanceType[]>({
    queryKey: ["/api/attendance", selectedDate],
  });

  const { data: todayStatus } = useQuery({
    queryKey: ["/api/attendance/today-status"],
  });

  const handleCheckIn = async () => {
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/today-status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      }
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/today-status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      }
    } catch (error) {
      console.error('Check-out failed:', error);
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
      <div>
        <h1 className="text-3xl font-semibold mb-1">Attendance</h1>
        <p className="text-muted-foreground">
          Track your attendance and working hours
        </p>
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
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-regularize-${record.id}`}
                        >
                          Regularize
                        </Button>
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
