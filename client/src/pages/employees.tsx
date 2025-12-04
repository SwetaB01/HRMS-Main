import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfile, UserRole, Department } from "@shared/schema";
import { EmployeeForm } from "@/components/employee-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [assigningLeaveFor, setAssigningLeaveFor] = useState<UserProfile | null>(null);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [totalLeaves, setTotalLeaves] = useState("10");
  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear().toString());
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/employees"],
  });

  const { data: roles } = useQuery<UserRole[]>({
    queryKey: ["/api/roles"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: leaveTypes } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

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

  // Check if current user can create/edit employees (Super Admin only)
  const canManageEmployees = !isLoadingUser && currentUser?.accessLevel === 'Admin';

  const getRoleName = (roleId: string | null) => {
    if (!roleId || !roles) return null;
    const role = roles.find(r => r.id === roleId);
    return role ? `${role.roleName} (${role.accessLevel})` : roleId;
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId || !departments) return null;
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : departmentId;
  };


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete employee');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
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

  const assignLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!assigningLeaveFor) throw new Error("No employee selected");
      const response = await fetch("/api/leave-quota/assign-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: assigningLeaveFor.id,
          leaveTypeId: leaveTypeId,
          totalLeaves: parseInt(totalLeaves),
          year: parseInt(leaveYear),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign leave quota");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setAssigningLeaveFor(null);
      setLeaveTypeId("");
      setTotalLeaves("10");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (employee: UserProfile) => {
    if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const filteredEmployees = employees?.filter((emp) =>
    `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.username}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // If user is not Super Admin, show access denied message
  if (!canManageEmployees) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-1">Employee Management</h1>
            <p className="text-muted-foreground">
              Manage employee profiles and access
            </p>
          </div>
        </div>
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground text-lg">
            Access Denied. Only Super Admin users can view employee management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employee profiles and access
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee profile
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                toast({
                  title: "Success",
                  description: "Employee created successfully",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-employees"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : filteredEmployees && filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      {employee.photo ? (
                        <img
                          src={employee.photo}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-500">
                          {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {employee.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{getDepartmentName(employee.departmentId) || "-"}</TableCell>
                  <TableCell>
                    {employee.roleId ? (
                      <Badge variant="outline">{getRoleName(employee.roleId)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">No role assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.status === "Active" ? "default" : "secondary"}
                      data-testid={`badge-status-${employee.id}`}
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Assign Leave Quota"
                        onClick={() => setAssigningLeaveFor(employee)}
                      >
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-edit-${employee.id}`}
                        onClick={() => setEditingEmployee(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-${employee.id}`}
                        onClick={() => handleDelete(employee)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingEmployee && (
        <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update employee information
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              employee={editingEmployee}
              onSuccess={() => {
                setEditingEmployee(null);
                queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                toast({
                  title: "Success",
                  description: "Employee updated successfully",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {assigningLeaveFor && (
        <Dialog open={!!assigningLeaveFor} onOpenChange={() => setAssigningLeaveFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Leave Quota</DialogTitle>
              <DialogDescription>
                Assign leave quota to {assigningLeaveFor.firstName} {assigningLeaveFor.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Leave Type</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
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
                  value={totalLeaves}
                  onChange={(e) => setTotalLeaves(e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Year</label>
                <input
                  type="number"
                  className="w-full mt-1 p-2 border rounded-md"
                  value={leaveYear}
                  onChange={(e) => setLeaveYear(e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setAssigningLeaveFor(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => assignLeaveMutation.mutate()}
                  disabled={!leaveTypeId || assignLeaveMutation.isPending}
                >
                  {assignLeaveMutation.isPending ? "Assigning..." : "Assign Quota"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}