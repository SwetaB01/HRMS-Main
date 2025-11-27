import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const reimbursementFormSchema = z.object({
  reimbursementTypeId: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category description is required"),
});

type ReimbursementFormData = z.infer<typeof reimbursementFormSchema>;

interface ReimbursementFormProps {
  onSuccess: () => void;
}

export function ReimbursementForm({ onSuccess }: ReimbursementFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ReimbursementFormData>({
    resolver: zodResolver(reimbursementFormSchema),
    defaultValues: {
      reimbursementTypeId: "",
      date: "",
      amount: "",
      category: "",
    },
  });

  const handleSubmit = async (data: ReimbursementFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        amount: data.amount, // Keep as string to match schema
        status: 'Pending',
        managerId: null,
        accountantId: null,
        attachment: null,
      };

      const response = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to submit reimbursement claim');
        setIsLoading(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/reimbursements"] });
      onSuccess();
    } catch (error) {
      console.error('Error submitting reimbursement:', error);
      alert('Failed to submit reimbursement claim');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="reimbursementTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Category *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-reimbursement-type">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="meals">Meals & Entertainment</SelectItem>
                  <SelectItem value="office-supplies">Office Supplies</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="phone-internet">Phone & Internet</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expense Date *</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-expense-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    data-testid="input-amount"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide details about the expense..."
                  data-testid="textarea-category"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Receipt/Invoice</FormLabel>
          <Input type="file" accept="image/*,.pdf" data-testid="input-attachment" />
          <p className="text-xs text-muted-foreground">
            Upload image or PDF (Max 5MB)
          </p>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit-claim"
          >
            {isLoading ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
