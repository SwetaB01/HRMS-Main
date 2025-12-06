import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Plus } from "lucide-react";
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
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  joiningDate?: string;
  departmentId?: string;
  department?: {
    id: string;
    name: string;
  };
  grade?: string;
  payGroup?: string;
  status?: string;
}

interface Department {
  id: string;
  name: string;
}

export default function PayrollPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null); // Added state for selected payroll

  const { data: currentUser, isLoading: isLoadingUser } = useQuery<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    roleName: string;
    accessLevel: string;
    roleId: string | null;
  }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: currentUser?.accessLevel === 'Admin',
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: payrolls, isLoading } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll"],
    enabled: !isLoadingUser,
  });

  const generatePayrollMutation = useMutation({
    mutationFn: async (data: { userId: string; month: number; year: number }) => {
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate payroll");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({
        title: "Success",
        description: "Payroll generated successfully",
      });
      setShowGenerateDialog(false);
      setSelectedEmployee("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateBulkPayrollMutation = useMutation({
    mutationFn: async (data: { month: number; year: number }) => {
      const response = await fetch("/api/payroll/generate-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate bulk payroll");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({
        title: "Success",
        description: `Generated ${data.successCount} payrolls successfully${data.errorCount > 0 ? `, ${data.errorCount} failed` : ''}`,
      });
      setShowGenerateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGeneratePayroll = () => {
    if (selectedEmployee === "all") {
      generateBulkPayrollMutation.mutate({
        month: selectedMonth,
        year: selectedYear,
      });
    } else if (selectedEmployee) {
      generatePayrollMutation.mutate({
        userId: selectedEmployee,
        month: selectedMonth,
        year: selectedYear,
      });
    }
  };

  const isSuperAdmin = currentUser?.accessLevel === 'Admin';

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

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Payroll</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin ? "Manage employee payroll and salary slips" : "View your salary slips"}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Payroll
          </Button>
        )}
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
                  {isSuperAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Month/Year</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>PF Deduction</TableHead>
                  <TableHead>Income Tax</TableHead>
                  <TableHead>LOP</TableHead>
                  <TableHead>Reimbursements</TableHead>
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
                        {isSuperAdmin && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
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
                  payrolls.map((payroll) => {
                    const employee = employees?.find(e => e.id === payroll.userId);
                    return (
                      <TableRow key={payroll.id} data-testid={`row-payroll-${payroll.id}`}>
                        {isSuperAdmin && (
                          <TableCell>
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {months[payroll.month - 1]} {payroll.year}
                        </TableCell>
                        <TableCell>₹{parseFloat(payroll.grossSalary || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>₹{parseFloat(payroll.pfDeduction || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>₹{parseFloat(payroll.incomeTax || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {parseFloat(payroll.lopDays || '0')} days
                          <br />
                          <span className="text-sm text-muted-foreground">₹{parseFloat(payroll.lopAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </TableCell>
                        <TableCell>₹{parseFloat(payroll.reimbursements || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="font-semibold">₹{parseFloat(payroll.netSalary || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-download-${payroll.id}`}
                            onClick={() => setSelectedPayroll(payroll)} // Set selected payroll on click
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Payslip
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">
                      {isSuperAdmin ? "No payroll records found. Click 'Generate Payroll' to create salary slips." : "No payroll records found. Contact HR if you believe this is an error."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
            <DialogDescription>
              Generate payroll for an employee or all employees for a specific month and year.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayroll}
              disabled={!selectedEmployee || generatePayrollMutation.isPending || generateBulkPayrollMutation.isPending}
            >
              {generatePayrollMutation.isPending || generateBulkPayrollMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for displaying selected payroll details */}
      {selectedPayroll && (() => {
        const employee = employees?.find(e => e.id === selectedPayroll.userId);
        const dept = employee?.departmentId 
          ? departments?.find(d => d.id === employee.departmentId)
          : null;
        
        return (
        <Dialog open={!!selectedPayroll} onOpenChange={() => setSelectedPayroll(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Salary Slip</DialogTitle>
              <DialogDescription>
                {new Date(selectedPayroll.year, selectedPayroll.month - 1).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Employee Details Section */}
              <div className="bg-muted/50 rounded-md p-4 space-y-3">
                <h4 className="font-semibold text-sm">Employee Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{employee?.firstName} {employee?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{selectedPayroll.userId.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-medium">{dept?.name || 'Not Assigned'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Joining</p>
                    <p className="font-medium">
                      {employee?.joiningDate 
                        ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Not Set'}
                    </p>
                  </div>
                  {employee?.grade && (
                    <div>
                      <p className="text-muted-foreground">Grade</p>
                      <p className="font-medium">{employee.grade}</p>
                    </div>
                  )}
                  {employee?.payGroup && (
                    <div>
                      <p className="text-muted-foreground">Pay Group</p>
                      <p className="font-medium">{employee.payGroup}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Salary Details Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Salary Details</h4>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-2 text-xs text-blue-800 dark:text-blue-200">
                  All amounts are monthly calculations based on annual salary components.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gross Salary</p>
                  <p className="font-medium">₹{parseFloat(selectedPayroll.grossSalary || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PF Deduction</p>
                  <p className="font-medium">₹{parseFloat(selectedPayroll.pfDeduction || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Income Tax</p>
                  <p className="font-medium">₹{parseFloat(selectedPayroll.incomeTax || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reimbursements</p>
                  <p className="font-medium">₹{parseFloat(selectedPayroll.reimbursements || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LOP</p>
                <p className="font-medium">
                  {parseFloat(selectedPayroll.lopDays || '0')} days
                  <span className="text-sm text-muted-foreground"> (₹{parseFloat(selectedPayroll.lopAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </p>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Net Salary</p>
                <p className="font-bold text-lg">₹{parseFloat(selectedPayroll.netSalary || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{getStatusBadge(selectedPayroll.status)}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayroll(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      })()}
    </div>
  );
}