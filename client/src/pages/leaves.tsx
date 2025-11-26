import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Calendar, CheckCircle, XCircle, Users, Check, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Leave, LeaveLedger } from "@shared/schema";
import { LeaveForm } from "@/components/leave-form";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Leaves() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssignQuotaDialogOpen, setIsAssignQuotaDialogOpen] = useState(false);
  const [quotaLeaveTypeId, setQuotaLeaveTypeId] = useState("");
  const [quotaAmount, setQuotaAmount] = useState("10");
  const [quotaYear, setQuotaYear] = useState(new Date().getFullYear().toString());

  const { data: leaves, isLoading, refetch } = useQuery<Leave[]>({
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

  const { data: employees, isLoading: isLoadingEmployees } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    retry: false,
    enabled: currentUser?.accessLevel !== 'Employee', // Only fetch if not a regular employee
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: pendingLeaveRequests, isLoading: isLoadingRequests } = useQuery<Leave[]>({
    queryKey: ["/api/approvals/leaves"],
    enabled: currentUser?.accessLevel === 'Manager' || currentUser?.accessLevel === 'Admin',
  });

  const approveLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      setIsSubmitting(true);
      const response = await fetch(`/api/leaves/${leaveId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve leave");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/leaves"] });
      setIsApproveDialogOpen(false);
      setComments("");
      setSelectedLeave(null);
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      alert(error.message || "Failed to approve leave");
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      setIsSubmitting(true);
      const response = await fetch(`/api/leaves/${leaveId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject leave");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/leaves"] });
      setIsRejectDialogOpen(false);
      setComments("");
      setSelectedLeave(null);
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      alert(error.message || "Failed to reject leave");
    },
  });

  const assignQuotaMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/leave-quota/assign-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leaveTypeId: quotaLeaveTypeId,
          totalLeaves: parseInt(quotaAmount),
          year: parseInt(quotaYear),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign leave quota");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance"] });
      setIsAssignQuotaDialogOpen(false);
      alert(`Successfully assigned leave quota to ${data.count} employees`);
    },
    onError: (error: any) => {
      alert(error.message || "Failed to assign leave quota");
    },
  });

  const handleApprove = () => {
    if (selectedLeave) {
      approveLeaveMutation.mutate(selectedLeave.id);
    }
  };

  const handleReject = () => {
    if (selectedLeave && comments.trim()) {
      rejectLeaveMutation.mutate(selectedLeave.id);
    }
  };


  const getLeaveTypeName = (leaveTypeId: string | null) => {
    if (!leaveTypeId || !leaveTypes) return leaveTypeId;
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
    return leaveType ? leaveType.name : leaveTypeId;
  };

  const getEmployeeName = (userId: string) => {
    // Check if it's the current user first
    if (currentUser && currentUser.id === userId) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }

    // If we don't have access to employees list (regular employee), just show "You" or "Employee"
    if (!employees || employees.length === 0) {
      return currentUser && currentUser.id === userId ? "You" : "Employee";
    }

    if (isLoadingEmployees) return "Loading...";

    const employee = employees.find(emp => emp.id === userId);
    if (!employee) {
      return "Employee";
    }

    return `${employee.firstName} ${employee.lastName}`;
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
        <div className="flex gap-2">
          {(currentUser?.accessLevel === 'Admin' || currentUser?.accessLevel === 'HR') && (
            <Dialog open={isAssignQuotaDialogOpen} onOpenChange={setIsAssignQuotaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Assign Quota to All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Leave Quota to All Employees</DialogTitle>
                  <DialogDescription>
                    Set leave quota for all active employees
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Leave Type</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={quotaLeaveTypeId}
                      onChange={(e) => setQuotaLeaveTypeId(e.target.value)}
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes?.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Leaves</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={quotaAmount}
                      onChange={(e) => setQuotaAmount(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Year</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={quotaYear}
                      onChange={(e) => setQuotaYear(e.target.value)}
                      min="2020"
                      max="2030"
                    />
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAssignQuotaDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => assignQuotaMutation.mutate()}
                      disabled={!quotaLeaveTypeId || assignQuotaMutation.isPending}
                    >
                      {assignQuotaMutation.isPending ? "Assigning..." : "Assign Quota"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                  refetch(); // Refetch leaves after a successful submission
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {leaveBalance && leaveBalance.length > 0 ? (
          leaveBalance.map((balance) => {
            const available = Number(balance.totalLeaves) - Number(balance.usedLeaves || 0);
            console.log('Leave balance calculation:', {
              leaveType: getLeaveTypeName(balance.leaveTypeId),
              total: balance.totalLeaves,
              used: balance.usedLeaves,
              available
            });
            return (
              <Card key={balance.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getLeaveTypeName(balance.leaveTypeId)}
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {available}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {balance.totalLeaves} available (used: {balance.usedLeaves || 0})
                  </p>
                </CardContent>
              </Card>
            );
          })
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

      {(currentUser?.accessLevel === 'Admin' || currentUser?.accessLevel === 'Manager') ? (
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">Leave History</TabsTrigger>
            <TabsTrigger value="requests">
              Leave Requests ({pendingLeaveRequests?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
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
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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
                            <TableCell className="font-medium">{getEmployeeName(leave.userId)}</TableCell>
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
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No leave applications found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Pending Leave Requests</CardTitle>
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
                      {isLoadingRequests ? (
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
                      ) : pendingLeaveRequests && pendingLeaveRequests.length > 0 ? (
                        pendingLeaveRequests.map((leave) => (
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
                            No pending leave requests
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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
                        <TableCell className="font-medium">{getEmployeeName(leave.userId)}</TableCell>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No leave applications found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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