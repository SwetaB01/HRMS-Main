import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Payroll } from "@shared/schema";

export default function PayrollPage() {
  const { data: payrolls, isLoading } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll"],
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "Draft": "secondary",
      "Approved": "default",
      "Paid": "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">Payroll</h1>
        <p className="text-muted-foreground">
          View your salary slips and payment history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month/Year</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Reimbursements</TableHead>
                  <TableHead>LOP Amount</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-20 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : payrolls && payrolls.length > 0 ? (
                  payrolls.map((payroll) => (
                    <TableRow key={payroll.id} data-testid={`row-payroll-${payroll.id}`}>
                      <TableCell className="font-medium">
                        {months[payroll.month - 1]} {payroll.year}
                      </TableCell>
                      <TableCell>₹{payroll.basicSalary}</TableCell>
                      <TableCell>₹{payroll.allowances}</TableCell>
                      <TableCell>₹{payroll.deductions}</TableCell>
                      <TableCell>₹{payroll.reimbursements}</TableCell>
                      <TableCell>₹{payroll.lopAmount}</TableCell>
                      <TableCell className="font-semibold">₹{payroll.netSalary}</TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-download-${payroll.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Payslip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No payroll records found
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
