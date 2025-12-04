
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Check, X } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Reimbursement, ReimbursementType } from "@shared/schema";

export default function Approvals() {
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isAttendanceApproveDialogOpen, setIsAttendanceApproveDialogOpen] = useState(false);
  const [isAttendanceRejectDialogOpen, setIsAttendanceRejectDialogOpen] = useState(false);
  const [isReimbApproveDialogOpen, setIsReimbApproveDialogOpen] = useState(false);
  const [isReimbRejectDialogOpen, setIsReimbRejectDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: pendingLeaves, isLoading } = useQuery<any[]>({
    queryKey: ["/api/approvals/leaves"],
    enabled: currentUser?.accessLevel === 'Manager' || currentUser?.accessLevel === 'Admin',
  });

  const { data: pendingAttendance, isLoading: isLoadingAttendance } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
    enabled: currentUser?.accessLevel === 'Manager' || currentUser?.accessLevel === 'Admin',
  });

  const { data: reimbursements = [], isLoading: isLoadingReimbursements } = useQuery<Reimbursement[]>({
    queryKey: ["/api/reimbursements"],
    enabled: currentUser?.accessLevel === 'Accountant' || currentUser?.accessLevel === 'Admin' || currentUser?.accessLevel === 'Manager',
  });

  const { data: leaveTypes } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: reimbursementTypes } = useQuery<ReimbursementType[]>({
    queryKey: ["/api/reimbursement-types"],
  });

  const { data: employees } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    enabled: currentUser?.accessLevel !== 'Employee',
  });

  const getLeaveTypeName = (leaveTypeId: string | null) => {
    if (!leaveTypeId || !leaveTypes) return leaveTypeId;
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
    return leaveType ? leaveType.name : leaveTypeId;
  };

  const getEmployeeName = (userId: string) => {
    if (currentUser && currentUser.id === userId) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    
    if (!employees || employees.length === 0) {
      return "Employee";
    }
    
    const employee = employees.find(emp => emp.id === userId);
    if (!employee) {
      return "Employee";
    }
    
    return `${employee.firstName} ${employee.lastName}`;
  };

  const handleApproveLeave = async () => {
    if (!selectedLeave) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leaves/${selectedLeave.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve leave");
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

  const handleRejectLeave = async () => {
    if (!selectedLeave || !comments.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leaves/${selectedLeave.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject leave");
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

  const handleApproveAttendance = async () => {
    if (!selectedAttendance) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/attendance/${selectedAttendance.id}/regularize/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve regularization");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setIsAttendanceApproveDialogOpen(false);
      setComments("");
      setSelectedAttendance(null);
      alert('Attendance regularization approved successfully!');
    } catch (error: any) {
      console.error('Failed to approve regularization:', error);
      alert(error.message || 'Failed to approve regularization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAttendance = async () => {
    if (!selectedAttendance || !comments.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/attendance/${selectedAttendance.id}/regularize/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject regularization");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setIsAttendanceRejectDialogOpen(false);
      setComments("");
      setSelectedAttendance(null);
      alert('Attendance regularization rejected successfully!');
    } catch (error: any) {
      console.error('Failed to reject regularization:', error);
      alert(error.message || 'Failed to reject regularization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveReimbursement = async (isManager: boolean) => {
    if (!selectedReimbursement) return;
    
    setIsSubmitting(true);
    try {
      const endpoint = isManager 
        ? `/api/reimbursements/${selectedReimbursement.id}/approve-manager`
        : `/api/reimbursements/${selectedReimbursement.id}/approve-accountant`;
      
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve reimbursement");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/reimbursements"] });
      setIsReimbApproveDialogOpen(false);
      setComments("");
      setSelectedReimbursement(null);
      alert('Reimbursement approved successfully!');
    } catch (error: any) {
      console.error('Failed to approve reimbursement:', error);
      alert(error.message || 'Failed to approve reimbursement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectReimbursement = async () => {
    if (!selectedReimbursement || !comments.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reimbursements/${selectedReimbursement.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject reimbursement");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/reimbursements"] });
      setIsReimbRejectDialogOpen(false);
      setComments("");
      setSelectedReimbursement(null);
      alert('Reimbursement rejected successfully!');
    } catch (error: any) {
      console.error('Failed to reject reimbursement:', error);
      alert(error.message || 'Failed to reject reimbursement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReimbursementTypeName = (typeId: string) => {
    const type = reimbursementTypes?.find(t => t.id === typeId);
    return type?.name || typeId;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "Open": "secondary",
      "Pending": "secondary",
      "Manager Approved": "default",
      "Approved": "default",
      "Rejected": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const pendingRegularizations = pendingAttendance?.filter(
    att => att.regularizationRequested && att.regularizationStatus === 'Pending'
  ) || [];

  const pendingReimbursements = reimbursements?.filter(r => 
    r.status === 'Pending' || r.status === 'Manager Approved'
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve pending leave requests, attendance regularizations, and reimbursements
          </p>
        </div>
      </div>

      <Tabs defaultValue="leaves" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaves">
            Leave Requests ({pendingLeaves?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="attendance">
            Attendance Regularizations ({pendingRegularizations.length})
          </TabsTrigger>
          <TabsTrigger value="reimbursements">
            Reimbursements ({pendingReimbursements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Attendance Regularizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAttendance ? (
                      <>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          </TableRow>
                        ))}
                      </>
                    ) : pendingRegularizations.length > 0 ? (
                      pendingRegularizations.map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell>{getEmployeeName(attendance.userId)}</TableCell>
                          <TableCell>{attendance.attendanceDate}</TableCell>
                          <TableCell>{attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString() : '-'}</TableCell>
                          <TableCell>{attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString() : '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{attendance.regularizationReason}</TableCell>
                          <TableCell>{getStatusBadge(attendance.regularizationStatus)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedAttendance(attendance);
                                  setIsAttendanceApproveDialogOpen(true);
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedAttendance(attendance);
                                  setIsAttendanceRejectDialogOpen(true);
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
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No pending attendance regularizations
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reimbursements ({pendingReimbursements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingReimbursements ? (
                      <>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          </TableRow>
                        ))}
                      </>
                    ) : pendingReimbursements.length > 0 ? (
                      pendingReimbursements.map((reimb) => (
                        <TableRow key={reimb.id}>
                          <TableCell>{getEmployeeName(reimb.userId)}</TableCell>
                          <TableCell>{getReimbursementTypeName(reimb.reimbursementTypeId)}</TableCell>
                          <TableCell>{reimb.date}</TableCell>
                          <TableCell>₹{reimb.amount}</TableCell>
                          <TableCell className="max-w-xs truncate">{reimb.category}</TableCell>
                          <TableCell>{getStatusBadge(reimb.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedReimbursement(reimb);
                                  setIsReimbApproveDialogOpen(true);
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedReimbursement(reimb);
                                  setIsReimbRejectDialogOpen(true);
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
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No pending reimbursements
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

      {/* Leave Approve Dialog */}
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
              <Button onClick={handleApproveLeave} disabled={isSubmitting}>
                {isSubmitting ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Reject Dialog */}
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
                onClick={handleRejectLeave}
                disabled={isSubmitting || !comments.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Approve Dialog */}
      <Dialog open={isAttendanceApproveDialogOpen} onOpenChange={setIsAttendanceApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Attendance Regularization</DialogTitle>
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
                  setIsAttendanceApproveDialogOpen(false);
                  setComments("");
                  setSelectedAttendance(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleApproveAttendance} disabled={isSubmitting}>
                {isSubmitting ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Reject Dialog */}
      <Dialog open={isAttendanceRejectDialogOpen} onOpenChange={setIsAttendanceRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Attendance Regularization</DialogTitle>
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
                  setIsAttendanceRejectDialogOpen(false);
                  setComments("");
                  setSelectedAttendance(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectAttendance}
                disabled={isSubmitting || !comments.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reimbursement Approve Dialog */}
      <Dialog open={isReimbApproveDialogOpen} onOpenChange={setIsReimbApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Reimbursement</DialogTitle>
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
                  setIsReimbApproveDialogOpen(false);
                  setComments("");
                  setSelectedReimbursement(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleApproveReimbursement(selectedReimbursement?.status === 'Pending')} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reimbursement Reject Dialog */}
      <Dialog open={isReimbRejectDialogOpen} onOpenChange={setIsReimbRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Reimbursement</DialogTitle>
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
                  setIsReimbRejectDialogOpen(false);
                  setComments("");
                  setSelectedReimbursement(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectReimbursement}
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
