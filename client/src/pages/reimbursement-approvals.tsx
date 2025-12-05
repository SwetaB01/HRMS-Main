
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
import type { Reimbursement, ReimbursementType } from "@shared/schema";

export default function ReimbursementApprovals() {
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: reimbursements = [], isLoading, error } = useQuery<Reimbursement[]>({
    queryKey: ["/api/reimbursements"],
    enabled: currentUser?.accessLevel === 'Accountant' || currentUser?.accessLevel === 'Admin',
  });

  console.log('Reimbursement approvals data:', { 
    reimbursements, 
    count: reimbursements?.length, 
    isLoading, 
    error,
    userAccessLevel: currentUser?.accessLevel 
  });

  const { data: reimbursementTypes } = useQuery<ReimbursementType[]>({
    queryKey: ["/api/reimbursement-types"],
  });

  const { data: employees } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  const getReimbursementTypeName = (typeId: string) => {
    const type = reimbursementTypes?.find(t => t.id === typeId);
    return type?.name || typeId;
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees?.find(emp => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Employee";
  };

  const handleApprove = async (isManager: boolean) => {
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
      setIsApproveDialogOpen(false);
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

  const handleReject = async () => {
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
      setIsRejectDialogOpen(false);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "Pending": "secondary",
      "Approved by Manager": "default",
      "Approved by Accountant": "default",
      "Rejected by Manager": "destructive",
      "Rejected by Accountant": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const pendingReimbursements = reimbursements?.filter(r => 
    r.status === 'Pending' || r.status === 'Approved by Manager'
  ) || [];

  if (currentUser?.accessLevel !== 'Accountant' && currentUser?.accessLevel !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access denied. Only Accountants and Admins can approve reimbursements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Reimbursement Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve pending reimbursement claims
          </p>
        </div>
      </div>

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
                {isLoading ? (
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
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-destructive">
                      Error loading reimbursements: {error instanceof Error ? error.message : 'Unknown error'}
                    </TableCell>
                  </TableRow>
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
                              setSelectedReimbursement(reimb);
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

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
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
                  setIsApproveDialogOpen(false);
                  setComments("");
                  setSelectedReimbursement(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleApprove(selectedReimbursement?.status === 'Pending')} 
                disabled={isSubmitting}
              >
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
                  setIsRejectDialogOpen(false);
                  setComments("");
                  setSelectedReimbursement(null);
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
