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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee?.photo || null);

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: roles } = useQuery<UserRole[]>({
    queryKey: ["/api/roles"],
  });

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