import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserProfile, Department, UserRole } from "@shared/schema";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, CreditCard, Building, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BankDetails {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branchName: string | null;
  ifscCode: string;
  accountType: string | null;
  isPrimary: boolean | null;
}

const employeeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  gender: z.string().optional(),
  birthdate: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  status: z.string().default("Active"),
  userType: z.string().optional(),
  bankAccount: z.string().optional(),
  insuranceOpted: z.string().optional(),
  joiningDate: z.string().optional(),
  photo: z.string().optional(),
  departmentId: z.string().optional(),
  roleId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  employee?: UserProfile | null;
  onSuccess: () => void;
}

// Bank details form schema
const bankDetailsFormSchema = z.object({
  accountHolderName: z.string().min(1, "Account holder name is required"),
  accountNumber: z.string().min(9, "Account number must be at least 9 digits").max(18, "Account number must be at most 18 digits"),
  confirmAccountNumber: z.string().min(9, "Please confirm account number"),
  bankName: z.string().min(1, "Bank name is required"),
  branchName: z.string().optional(),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g., SBIN0001234)"),
  accountType: z.string().default("Savings"),
  isPrimary: z.boolean().default(true),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: "Account numbers do not match",
  path: ["confirmAccountNumber"],
});

type BankDetailsFormData = z.infer<typeof bankDetailsFormSchema>;

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee?.photo || null);
  const [salaryComponents, setSalaryComponents] = useState<Array<{
    componentId: string;
    amount: string;
  }>>([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBankDetails, setEditingBankDetails] = useState<BankDetails | null>(null);
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const { toast } = useToast();

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: roles } = useQuery<UserRole[]>({
    queryKey: ["/api/roles"],
  });

  const { data: availableComponents } = useQuery<any[]>({
    queryKey: ["/api/salary-components"],
  });

  // Fetch bank details for existing employee
  const { data: bankDetails, isLoading: isLoadingBankDetails } = useQuery<BankDetails[]>({
    queryKey: ["/api/employees", employee?.id, "bank-details"],
    enabled: !!employee?.id,
  });

  const bankForm = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsFormSchema),
    defaultValues: {
      accountHolderName: "",
      accountNumber: "",
      confirmAccountNumber: "",
      bankName: "",
      branchName: "",
      ifscCode: "",
      accountType: "Savings",
      isPrimary: true,
    },
  });

  const handleBankDetailsSubmit = async (data: BankDetailsFormData) => {
    if (!employee?.id) return;
    
    setSavingBankDetails(true);
    try {
      const payload = {
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        confirmAccountNumber: data.confirmAccountNumber,
        bankName: data.bankName,
        branchName: data.branchName || null,
        ifscCode: data.ifscCode.toUpperCase(),
        accountType: data.accountType,
        isPrimary: data.isPrimary,
      };

      if (editingBankDetails) {
        await apiRequest("PATCH", `/api/employees/${employee.id}/bank-details/${editingBankDetails.id}`, payload);
        toast({
          title: "Bank details updated",
          description: "Employee bank details have been updated successfully.",
        });
      } else {
        await apiRequest("POST", `/api/employees/${employee.id}/bank-details`, payload);
        toast({
          title: "Bank details added",
          description: "Employee bank details have been added successfully.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/employees", employee.id, "bank-details"] });
      setBankDialogOpen(false);
      setEditingBankDetails(null);
      bankForm.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save bank details",
        variant: "destructive",
      });
    } finally {
      setSavingBankDetails(false);
    }
  };

  const openEditBankDialog = (details: BankDetails) => {
    setEditingBankDetails(details);
    bankForm.reset({
      accountHolderName: details.accountHolderName,
      accountNumber: details.accountNumber,
      confirmAccountNumber: details.accountNumber,
      bankName: details.bankName,
      branchName: details.branchName || "",
      ifscCode: details.ifscCode,
      accountType: details.accountType || "Savings",
      isPrimary: details.isPrimary ?? true,
    });
    setBankDialogOpen(true);
  };

  const openAddBankDialog = () => {
    setEditingBankDetails(null);
    bankForm.reset({
      accountHolderName: employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : "",
      accountNumber: "",
      confirmAccountNumber: "",
      bankName: "",
      branchName: "",
      ifscCode: "",
      accountType: "Savings",
      isPrimary: true,
    });
    setBankDialogOpen(true);
  };

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: employee?.firstName || "",
      middleName: employee?.middleName || "",
      lastName: employee?.lastName || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      username: employee?.username || "",
      password: "",
      gender: employee?.gender || "",
      birthdate: employee?.birthdate || "",
      street: employee?.street || "",
      city: employee?.city || "",
      state: employee?.state || "",
      country: employee?.country || "",
      status: employee?.status || "Active",
      userType: employee?.userType || "",
      bankAccount: employee?.bankAccount || "",
      insuranceOpted: employee?.insuranceOpted ? "yes" : "no",
      joiningDate: employee?.joiningDate || "",
      photo: employee?.photo || "",
      departmentId: employee?.departmentId || "",
      roleId: employee?.roleId || "",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        form.setValue('photo', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (data: EmployeeFormData) => {
    try {
      setIsLoading(true);

      // Prepare data for submission
      const submitData: any = { ...data };

      // Remove password field if it's empty during edit
      if (employee && !data.password) {
        delete submitData.password;
      }

      // Convert insuranceOpted to boolean
      submitData.insuranceOpted = data.insuranceOpted === "yes";

      // Convert empty date strings to null to avoid database errors
      if (submitData.birthdate === "") submitData.birthdate = null;
      if (submitData.joiningDate === "") submitData.joiningDate = null;

      // Convert empty strings to null for optional fields
      if (submitData.phone === "") submitData.phone = null;
      if (submitData.gender === "") submitData.gender = null;
      if (submitData.street === "") submitData.street = null;
      if (submitData.city === "") submitData.city = null;
      if (submitData.state === "") submitData.state = null;
      if (submitData.country === "") submitData.country = null;
      if (submitData.userType === "") submitData.userType = null;
      if (submitData.bankAccount === "") submitData.bankAccount = null;
      if (submitData.middleName === "") submitData.middleName = null;
      if (submitData.departmentId === "") submitData.departmentId = null;
      if (submitData.roleId === "") submitData.roleId = null;

      const endpoint = employee
        ? `/api/employees/${employee.id}`
        : '/api/employees';

      const method = employee ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();

        // Check for access denied errors
        if (response.status === 403 || response.status === 401) {
          alert('Access Denied: ' + (error.message || 'You do not have permission to perform this action.'));
          throw new Error(error.message || 'Access denied');
        }

        throw new Error(error.message || 'Failed to save employee');
      }

      const savedEmployee = await response.json();

      // If creating new employee and salary components are defined, assign them
      if (!employee && salaryComponents.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        
        for (const component of salaryComponents) {
          if (component.componentId && component.amount) {
            try {
              const compResponse = await fetch(`/api/employees/${savedEmployee.id}/compensation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  componentId: component.componentId,
                  amount: component.amount,
                  effectiveFrom: today,
                  isActive: true,
                }),
              });

              if (!compResponse.ok) {
                const error = await compResponse.json();
                console.error('Failed to assign salary component:', error);
                toast({
                  title: "Warning",
                  description: `Failed to assign some salary components: ${error.message}`,
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error('Error assigning salary component:', error);
            }
          }
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      // You might want to show an error toast here
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John" data-testid="input-first-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="middleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Middle Name</FormLabel>
                <FormControl>
                  <Input placeholder="Michael" data-testid="input-middle-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" data-testid="input-last-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john.doe@midcai.com"
                    data-testid="input-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+91-9503118434" data-testid="input-phone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username *</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe" data-testid="input-username-form" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password {!employee && "*"}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={employee ? "Leave blank to keep current" : "Enter password"}
                    data-testid="input-password-form"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="photo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Photo</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    {photoPreview && (
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      data-testid="input-photo"
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthdate</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-birthdate" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="joiningDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joining Date</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-joining-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="userType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-user-type">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="insuranceOpted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurance Opted</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-insurance">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role / Access Level</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.roleName}</span>
                          <span className="text-xs text-muted-foreground">
                            {role.accessType} - {role.accessLevel}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Assign a role to define access permissions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!employee && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Salary Components</h3>
                <p className="text-sm text-muted-foreground">
                  Define salary structure for the new employee
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSalaryComponents([...salaryComponents, { componentId: '', amount: '' }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Component
              </Button>
            </div>

            {salaryComponents.length > 0 && (
              <div className="space-y-3">
                {salaryComponents.map((component, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-1 block">Component</label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={component.componentId}
                        onChange={(e) => {
                          const updated = [...salaryComponents];
                          updated[index].componentId = e.target.value;
                          setSalaryComponents(updated);
                        }}
                      >
                        <option value="">Select component</option>
                        {availableComponents?.map((comp) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.name} ({comp.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-1 block">Annual Amount</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={component.amount}
                        onChange={(e) => {
                          const updated = [...salaryComponents];
                          updated[index].amount = e.target.value;
                          setSalaryComponents(updated);
                        }}
                      />
                      {component.amount && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Monthly: ₹{(parseFloat(component.amount) / 12).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6"
                      onClick={() => {
                        const updated = salaryComponents.filter((_, i) => i !== index);
                        setSalaryComponents(updated);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {salaryComponents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/50">
                No salary components added. Click "Add Component" to define the employee's salary structure (annual amounts).
              </p>
            )}
          </div>
        )}

        {/* Bank Details Section - Only for existing employees */}
        {employee && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Bank Details
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage bank account details for salary payment
                </p>
              </div>
              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={openAddBankDialog}
                    data-testid="button-add-bank-details-admin"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBankDetails ? "Edit Bank Details" : "Add Bank Account"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingBankDetails 
                        ? "Update bank account information."
                        : "Add a new bank account for this employee."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...bankForm}>
                    <form onSubmit={bankForm.handleSubmit(handleBankDetailsSubmit)} className="space-y-4">
                      <FormField
                        control={bankForm.control}
                        name="accountHolderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Holder Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Full name as per bank records" 
                                data-testid="input-account-holder-admin"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., State Bank of India" 
                                data-testid="input-bank-name-admin"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="branchName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Branch Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Jaipur Main Branch" 
                                data-testid="input-branch-name-admin"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number *</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="Enter account number" 
                                data-testid="input-account-number-admin"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="confirmAccountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Account Number *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Re-enter account number" 
                                data-testid="input-confirm-account-number-admin"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="ifscCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IFSC Code *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., SBIN0001234" 
                                className="uppercase"
                                data-testid="input-ifsc-code-admin"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-account-type-admin">
                                  <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Savings">Savings Account</SelectItem>
                                <SelectItem value="Current">Current Account</SelectItem>
                                <SelectItem value="Salary">Salary Account</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setBankDialogOpen(false);
                            setEditingBankDetails(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={savingBankDetails} data-testid="button-save-bank-details-admin">
                          {savingBankDetails ? "Saving..." : editingBankDetails ? "Update" : "Add Account"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingBankDetails ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : bankDetails && bankDetails.length > 0 ? (
              <div className="space-y-3">
                {bankDetails.map((details) => (
                  <div 
                    key={details.id} 
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`card-bank-details-admin-${details.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <Building className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{details.bankName}</p>
                          {details.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          A/C: XXXX{details.accountNumber.slice(-4)} | IFSC: {details.ifscCode}
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditBankDialog(details)}
                      data-testid={`button-edit-bank-admin-${details.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/50">
                No bank details added. Click "Add Bank Account" to add bank account details for salary payment.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit-employee"
          >
            {isLoading ? "Saving..." : employee ? "Update Employee" : "Create Employee"}
          </Button>
        </div>
      </form>
    </Form>
  );
}