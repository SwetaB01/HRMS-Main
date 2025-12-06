
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { IndianRupee, Calendar, CreditCard, Plus, Building, Edit2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
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

interface CompensationComponent {
  id: string;
  componentName: string;
  componentType: string;
  annualAmount: number;
  monthlyAmount: number;
  effectiveFrom: string;
}

interface CompensationData {
  components: CompensationComponent[];
  summary: {
    totalAnnualEarnings: number;
    totalAnnualDeductions: number;
    totalAnnualSalary: number;
    totalMonthlyEarnings: number;
    totalMonthlyDeductions: number;
    totalMonthlySalary: number;
  };
}

const profileFormSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

// Bank Details Form Schema
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

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBankDetails, setEditingBankDetails] = useState<BankDetails | null>(null);
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const { toast } = useToast();

  // Fetch employee's own compensation data
  const { data: compensationData, isLoading: isLoadingCompensation } = useQuery<CompensationData>({
    queryKey: ["/api/my-compensation"],
    enabled: !!currentUser?.id,
  });

  // Fetch employee's bank details
  const { data: bankDetails, isLoading: isLoadingBankDetails } = useQuery<BankDetails[]>({
    queryKey: ["/api/my-bank-details"],
    enabled: !!currentUser?.id,
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
        await apiRequest("PATCH", `/api/my-bank-details/${editingBankDetails.id}`, payload);
        toast({
          title: "Bank details updated",
          description: "Your bank details have been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/my-bank-details", payload);
        toast({
          title: "Bank details added",
          description: "Your bank details have been added successfully.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/my-bank-details"] });
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
      accountHolderName: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : "",
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

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      street: "",
      city: "",
      state: "",
      country: "",
      language: "English",
      timezone: "Asia/Kolkata",
    },
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setCurrentUser(user);
    
    if (user.id) {
      fetch(`/api/employees/${user.id}`)
        .then(res => res.json())
        .then(data => {
          form.reset({
            street: data.street || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            language: data.language || "English",
            timezone: data.timezone || "Asia/Kolkata",
          });
        })
        .catch(err => {
          console.error('Failed to load profile:', err);
        });
    }
  }, [form]);

  const handleSubmit = async (data: ProfileFormData) => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">My Profile</h1>
        <p className="text-muted-foreground">
          Update your personal information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUser.photo && (
              <div className="flex justify-center">
                <img
                  src={currentUser.photo}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {currentUser.firstName} {currentUser.middleName} {currentUser.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{currentUser.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-medium">{currentUser.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{currentUser.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{currentUser.status}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Editable Information</CardTitle>
            <CardDescription>Update your address, language and timezone</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Address</h3>
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Jaipur" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Rajasthan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Preferences</h3>
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="German">German</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                            <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                            <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* My Salary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            My Salary
          </CardTitle>
          <CardDescription>
            View your salary breakdown. All amounts are defined as annual values and calculated monthly for payroll.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCompensation ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : compensationData && compensationData.components.length > 0 ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Annual CTC</p>
                  <p className="text-2xl font-bold" data-testid="text-annual-salary">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(compensationData.summary.totalAnnualSalary)}
                  </p>
                </div>
                <div className="p-4 rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Monthly Gross</p>
                  <p className="text-2xl font-bold" data-testid="text-monthly-salary">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(compensationData.summary.totalMonthlySalary)}
                  </p>
                </div>
                <div className="p-4 rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Monthly Deductions</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-monthly-deductions">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(compensationData.summary.totalMonthlyDeductions)}
                  </p>
                </div>
              </div>

              {/* Component Breakdown Table */}
              <div>
                <h4 className="font-semibold mb-3">Salary Components</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Annual Amount</TableHead>
                        <TableHead className="text-right">Monthly Amount</TableHead>
                        <TableHead>Effective From</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compensationData.components.map((component) => (
                        <TableRow key={component.id} data-testid={`row-compensation-${component.id}`}>
                          <TableCell className="font-medium">{component.componentName}</TableCell>
                          <TableCell>
                            <Badge variant={component.componentType === 'Earning' ? 'default' : 'secondary'}>
                              {component.componentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(component.annualAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(component.monthlyAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(component.effectiveFrom).toLocaleDateString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Note about payroll */}
              <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Your actual monthly payslip may vary based on attendance, leaves, reimbursements, PF contributions, and income tax deductions. View the Payroll section for detailed monthly salary slips.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No salary components have been assigned yet.</p>
              <p className="text-sm mt-2">Contact HR if you believe this is an error.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Details Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Details
            </CardTitle>
            <CardDescription>
              Manage your bank account details for salary payment.
            </CardDescription>
          </div>
          <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddBankDialog} data-testid="button-add-bank-details">
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
                    ? "Update your bank account information."
                    : "Add a new bank account for salary payment."}
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
                            data-testid="input-account-holder"
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
                            data-testid="input-bank-name"
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
                            data-testid="input-branch-name"
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
                            data-testid="input-account-number"
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
                            data-testid="input-confirm-account-number"
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
                            data-testid="input-ifsc-code"
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
                            <SelectTrigger data-testid="select-account-type">
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
                    <Button type="submit" disabled={savingBankDetails} data-testid="button-save-bank-details">
                      {savingBankDetails ? "Saving..." : editingBankDetails ? "Update" : "Add Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingBankDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : bankDetails && bankDetails.length > 0 ? (
            <div className="space-y-4">
              {bankDetails.map((details) => (
                <div 
                  key={details.id} 
                  className="flex items-center justify-between p-4 rounded-md border"
                  data-testid={`card-bank-details-${details.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-muted">
                      <Building className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{details.bankName}</p>
                        {details.isPrimary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A/C: XXXX{details.accountNumber.slice(-4)} | IFSC: {details.ifscCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {details.accountHolderName} | {details.accountType || "Savings"} Account
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditBankDialog(details)}
                    data-testid={`button-edit-bank-${details.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bank details added yet.</p>
              <p className="text-sm mt-2">Add your bank account details for salary payment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
