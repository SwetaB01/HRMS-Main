import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SalaryComponent, EmployeeCompensation } from "@shared/schema";

export default function CompensationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [componentForm, setComponentForm] = useState({
    name: "",
    type: "Earning" as "Earning" | "Deduction",
    description: "",
    isActive: true,
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

  const { data: components, isLoading: isLoadingComponents } = useQuery<SalaryComponent[]>({
    queryKey: ["/api/salary-components"],
    enabled: !isLoadingUser && currentUser?.accessLevel === 'Admin',
  });

  const createComponentMutation = useMutation({
    mutationFn: async (data: typeof componentForm) => {
      const response = await fetch("/api/salary-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create salary component");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-components"] });
      setIsComponentDialogOpen(false);
      setComponentForm({
        name: "",
        type: "Earning",
        description: "",
        isActive: true,
      });
      toast({
        title: "Success",
        description: "Salary component created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salary component",
        variant: "destructive",
      });
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<typeof componentForm>;
    }) => {
      const response = await fetch(`/api/salary-components/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update salary component");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-components"] });
      setIsComponentDialogOpen(false);
      setComponentForm({
        name: "",
        type: "Earning",
        description: "",
        isActive: true,
      });
      toast({
        title: "Success",
        description: "Salary component updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary component",
        variant: "destructive",
      });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/salary-components/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete salary component");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-components"] });
      toast({
        title: "Success",
        description: "Salary component deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete salary component",
        variant: "destructive",
      });
    },
  });

  const handleComponentDialogOpen = (component?: SalaryComponent) => {
    if (component) {
      setEditingComponent(component);
      setComponentForm({
        name: component.name,
        type: component.type as "Earning" | "Deduction",
        description: component.description || "",
        isActive: component.isActive ?? true,
      });
    } else {
      setEditingComponent(null);
      setComponentForm({
        name: "",
        type: "Earning",
        description: "",
        isActive: true,
      });
    }
    setIsComponentDialogOpen(true);
  };

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (currentUser?.accessLevel !== 'Admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Salary Components</h1>
          <p className="text-muted-foreground">
            Manage salary components for employee compensation
          </p>
        </div>
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground text-lg">
            Access Denied. Only Super Admin users can access salary components and compensation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Salary Components</h1>
          <p className="text-muted-foreground">
            Manage salary components for employee compensation
          </p>
        </div>
        <Button onClick={() => handleComponentDialogOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary Components</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingComponents ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : components && components.length > 0 ? (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>
                      <Badge variant={component.type === "Earning" ? "default" : "secondary"}>
                        {component.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{component.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={component.isActive ? "default" : "outline"}>
                        {component.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComponentDialogOpen(component)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this component?")) {
                            deleteComponentMutation.mutate(component.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No salary components found. Click the button above to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Employee Compensation Section - Only for Super Admin */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Compensation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage individual employee salary structures. All amounts are stored as annual values and calculated monthly for payroll.
          </p>
          <div className="text-center text-muted-foreground py-8">
            This feature allows you to view employee compensation details.
            Salary components are defined during employee creation as annual amounts.
          </div>
        </CardContent>
      </Card>

      <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingComponent ? "Edit Salary Component" : "Add Salary Component"}
            </DialogTitle>
            <DialogDescription>
              {editingComponent
                ? "Update the details of an existing salary component."
                : "Enter the details for a new salary component."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Component Name *</Label>
              <Input
                id="name"
                value={componentForm.name}
                onChange={(e) =>
                  setComponentForm({ ...componentForm, name: e.target.value })
                }
                placeholder="e.g., Basic Salary, HRA, Professional Tax"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={componentForm.type}
                onValueChange={(value) =>
                  setComponentForm({ ...componentForm, type: value as "Earning" | "Deduction" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select component type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Earning">Earning</SelectItem>
                  <SelectItem value="Deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={componentForm.description}
                onChange={(e) =>
                  setComponentForm({ ...componentForm, description: e.target.value })
                }
                placeholder="Enter component description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={componentForm.isActive}
                onCheckedChange={(checked) =>
                  setComponentForm({ ...componentForm, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsComponentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingComponent) {
                  updateComponentMutation.mutate({
                    id: editingComponent.id,
                    data: componentForm,
                  });
                } else {
                  createComponentMutation.mutate(componentForm);
                }
              }}
              disabled={!componentForm.name.trim() || createComponentMutation.isPending || updateComponentMutation.isPending}
            >
              {editingComponent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}