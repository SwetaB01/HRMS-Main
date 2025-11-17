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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  halfDay: z.boolean().default(false),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

interface LeaveFormProps {
  onSuccess: () => void;
}

export function LeaveForm({ onSuccess }: LeaveFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveTypeId: "",
      fromDate: "",
      toDate: "",
      halfDay: false,
      reason: "",
    },
  });

  const handleSubmit = async (data: LeaveFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        userId: 'current-user', // Will be set by server from session
        companyId: null,
        status: 'Open',
        managerId: null,
      };

      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookie
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit leave');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance"] });
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="leaveTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="earned">Earned Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Date *</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-from-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Date *</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-to-date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="halfDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-half-day"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Half Day Leave</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain the reason for leave..."
                  data-testid="textarea-reason"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit-leave"
          >
            {isLoading ? "Submitting..." : "Submit Leave Application"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
