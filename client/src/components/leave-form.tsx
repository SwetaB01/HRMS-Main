import { useForm, useWatch } from "react-hook-form";
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
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

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

// Helper function to calculate leave days
function calculateLeaveDays(fromDate: string, toDate: string, halfDay: boolean): number {
  if (!fromDate || !toDate) return 0;
  
  // Parse dates as local dates (without timezone conversion)
  const from = new Date(fromDate + 'T00:00:00');
  const to = new Date(toDate + 'T00:00:00');
  
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  if (to < from) return 0;
  
  // Calculate difference in days (inclusive of both dates)
  const diffTime = to.getTime() - from.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  // If half day is checked, only 0.5 days regardless of date range
  return halfDay ? 0.5 : diffDays;
}

export function LeaveForm({ onSuccess }: LeaveFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { data: leaveTypes } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/leave-types"],
  });

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
  
  // Watch form values for live calculation
  const watchedFromDate = useWatch({ control: form.control, name: "fromDate" });
  const watchedToDate = useWatch({ control: form.control, name: "toDate" });
  const watchedHalfDay = useWatch({ control: form.control, name: "halfDay" });
  
  // Calculate leave days based on form values
  const leaveDays = useMemo(() => {
    return calculateLeaveDays(watchedFromDate || "", watchedToDate || "", watchedHalfDay || false);
  }, [watchedFromDate, watchedToDate, watchedHalfDay]);

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
        const errorData = await response.json();
        alert(errorData.message || 'Failed to submit leave');
        setIsLoading(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance"] });
      onSuccess();
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert('Failed to submit leave application');
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
                  {leaveTypes && leaveTypes.length > 0 ? (
                    leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No leave types available
                    </div>
                  )}
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

        {/* Display calculated leave days */}
        {leaveDays > 0 && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex items-center gap-3 py-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Number of Days: </span>
                <span className="font-semibold" data-testid="text-leave-days">
                  {leaveDays} {leaveDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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
