import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Leave, LeaveLedger } from "@shared/schema";
import { LeaveForm } from "@/components/leave-form";

export default function Leaves() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: leaves, isLoading } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  const { data: leaveBalance } = useQuery<LeaveLedger[]>({
    queryKey: ["/api/leave-balance"],
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: leaveTypes } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

  const getLeaveTypeName = (leaveTypeId: string | null) => {
    if (!leaveTypeId || !leaveTypes) return leaveTypeId;
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
    return leaveType ? leaveType.name : leaveTypeId;
  };

  const { data: pendingApprovals } = useQuery<Leave[]>({
    queryKey: ["/api/approvals/leaves"],
    enabled: !!currentUser && ['Manager', 'HR Executive', 'Tech Lead', 'Project Manager', 'Admin'].includes(currentUser.roleName),
  });

  const pendingLeaves = useMemo(() => {
    if (!pendingApprovals || !currentUser) return [];
    
    // Only show pending approvals to managers, HR, and admins
    const allowedRoles = ['Manager', 'HR Executive', 'Tech Lead', 'Project Manager', 'Admin'];
    if (!allowedRoles.includes(currentUser.roleName)) {
      return [];
    }
    
    return pendingApprovals;
  }, [pendingApprovals, currentUser]);

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
        throw new Error('Failed to approve leave');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/approvals/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      setIsApproveDialogOpen(false);
      setComments("");
      setSelectedLeave(null);
    } catch (error) {
      console.error('Failed to approve leave:', error);
      alert('Failed to approve leave. Please try again.');
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
        throw new Error('Failed to reject leave');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/approvals/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      setIsRejectDialogOpen(false);
      setComments("");
      setSelectedLeave(null);
    } catch (error) {
      console.error('Failed to reject leave:', error);
      alert('Failed to reject leave. Please try again.');
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
          <h1 className="text-3xl font-semibold mb-1">Leave Management</h1>
          <p className="text-muted-foreground">
            Apply for leaves and track your balance
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-apply-leave">
              <Plus className="h-4 w-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave application
              </DialogDescription>
            </DialogHeader>
            <LeaveForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {leaveBalance && leaveBalance.length > 0 ? (
          leaveBalance.map((balance) => (
            <Card key={balance.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getLeaveTypeName(balance.leaveTypeId)}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(balance.totalLeaves) - Number(balance.usedLeaves || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {balance.totalLeaves} available
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No leave quota assigned</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Approvals Section for Managers/HR only */}
      {currentUser && ['Manager', 'HR Executive', 'Tech Lead', 'Project Manager', 'Admin'].includes(currentUser.roleName) && pendingLeaves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Leave Approvals</CardTitle>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{leave.employeeName}</TableCell>
                      <TableCell>{getLeaveTypeName(leave.leaveTypeId)}</TableCell>
                      <TableCell>{leave.fromDate}</TableCell>
                      <TableCell>{leave.toDate}</TableCell>
                      <TableCell>{leave.halfDay ? '0.5' : '1'}</TableCell>
                      <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setIsApproveDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From Date</TableHead>
                  <TableHead>To Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Manager Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : leaves && leaves.length > 0 ? (
                  leaves.map((leave) => (
                    <TableRow key={leave.id} data-testid={`row-leave-${leave.id}`}>
                      <TableCell>{getLeaveTypeName(leave.leaveTypeId)}</TableCell>
                      <TableCell>{leave.fromDate}</TableCell>
                      <TableCell>{leave.toDate}</TableCell>
                      <TableCell>{leave.halfDay ? '0.5' : '1'}</TableCell>
                      <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>{leave.managerComments || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leave applications found
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