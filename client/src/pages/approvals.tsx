import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Check, X } from "lucide-react";
import { Leave } from "@shared/schema";

export default function Approvals() {
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: pendingLeaves, isLoading } = useQuery<Leave[]>({
    queryKey: ["/api/approvals/leaves"],
    enabled: !!currentUser && (currentUser?.accessLevel === 'Manager' || currentUser?.accessLevel === 'Admin'),
  });

  const { data: employees } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaveTypes } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

  const getLeaveTypeName = (leaveTypeId: string | null) => {
    if (!leaveTypeId || !leaveTypes) return leaveTypeId;
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
    return leaveType ? leaveType.name : leaveTypeId;
  };

  // Check if user has permission to view approvals - managers and admins
  const hasApprovalAccess = currentUser && (currentUser.accessLevel === 'Manager' || currentUser.accessLevel === 'Admin');

  if (!hasApprovalAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const getEmployeeName = (userId: string) => {
    if (!employees) return 'Loading...';
    const employee = employees.find(emp => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leaves/${selectedLeave.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve leave');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/approvals/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      setIsApproveDialogOpen(false);
      setComments("");
      setSelectedLeave(null);
      alert('Leave approved successfully!');
    } catch (error: any) {
      console.error('Failed to approve leave:', error);
      alert(error.message || 'Failed to approve leave. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLeave || !comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leaves/${selectedLeave.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject leave');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/approvals/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      setIsRejectDialogOpen(false);
      setComments("");
      setSelectedLeave(null);
      alert('Leave rejected successfully!');
    } catch (error: any) {
      console.error('Failed to reject leave:', error);
      alert(error.message || 'Failed to reject leave. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "Open": "secondary",
      "Approved": "default",
      "Rejected": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve pending leave applications from your department
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Leave Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From Date</TableHead>
                  <TableHead>To Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : pendingLeaves && pendingLeaves.length > 0 ? (
                  pendingLeaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{getEmployeeName(leave.userId)}</TableCell>
                      <TableCell>{getLeaveTypeName(leave.leaveTypeId)}</TableCell>
                      <TableCell>{leave.fromDate}</TableCell>
                      <TableCell>{leave.toDate}</TableCell>
                      <TableCell>{leave.halfDay ? '0.5' : '1'}</TableCell>
                      <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedLeave(leave);
                              setIsApproveDialogOpen(true);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedLeave(leave);
                              setIsRejectDialogOpen(true);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No pending leave applications
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Application</DialogTitle>
            <DialogDescription>
              Add optional comments for the employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApproveDialogOpen(false);
                  setComments("");
                  setSelectedLeave(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isSubmitting}>
                {isSubmitting ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection *"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              required
            />
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setComments("");
                  setSelectedLeave(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || !comments.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}