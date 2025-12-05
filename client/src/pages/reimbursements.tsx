import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Paperclip } from "lucide-react";
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
import { Reimbursement } from "@shared/schema";
import { ReimbursementForm } from "@/components/reimbursement-form";

export default function Reimbursements() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: reimbursements, isLoading, error, refetch } = useQuery<Reimbursement[]>({
    queryKey: ["/api/reimbursements"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  console.log('Reimbursements query state:', { 
    reimbursements, 
    count: reimbursements?.length, 
    isLoading, 
    error: error instanceof Error ? error.message : error,
    currentUser: currentUser?.username,
    currentUserRole: currentUser?.accessLevel,
    queryExecuted: !isLoading && !error,
    data: reimbursements
  });

  // Safely handle undefined data
  const reimbursementsList = reimbursements || [];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Reimbursements</h1>
          <p className="text-muted-foreground">
            Submit and track expense reimbursements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-submit-reimbursement">
                <Plus className="h-4 w-4 mr-2" />
                Submit Claim
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Reimbursement</DialogTitle>
                <DialogDescription>
                  Upload receipts and submit expense claim
                </DialogDescription>
              </DialogHeader>
              <ReimbursementForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Accountant</TableHead>
                  <TableHead>Attachment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-destructive">
                      Error loading reimbursements: {error instanceof Error ? error.message : 'Unknown error'}
                    </TableCell>
                  </TableRow>
                ) : reimbursementsList.length > 0 ? (
                  reimbursementsList.map((claim) => (
                    <TableRow key={claim.id} data-testid={`row-reimbursement-${claim.id}`}>
                      <TableCell>{claim.date}</TableCell>
                      <TableCell>{claim.category}</TableCell>
                      <TableCell>₹{claim.amount}</TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell>
                        {claim.managerApprovalDate ? '✓' : '-'}
                      </TableCell>
                      <TableCell>
                        {claim.accountantApprovalDate ? '✓' : '-'}
                      </TableCell>
                      <TableCell>
                        {claim.attachment ? (
                          <Button variant="ghost" size="sm">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No reimbursement claims found
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