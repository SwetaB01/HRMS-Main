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
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

const holidayFormSchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  totalHolidays: z.string().min(1, "Total holidays is required"),
});

type HolidayFormData = z.infer<typeof holidayFormSchema>;

interface HolidayFormProps {
  onSuccess: () => void;
}

export function HolidayForm({ onSuccess }: HolidayFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: "",
      fromDate: "",
      toDate: "",
      totalHolidays: "1",
    },
  });

  const handleSubmit = async (data: HolidayFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        totalHolidays: parseInt(data.totalHolidays),
        companyId: null,
      };

      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create holiday');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Holiday Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Diwali, Republic Day"
                  data-testid="input-holiday-name"
                  {...field}
                />
              </FormControl>
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
                <FormLabel>From Date</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-from-date-holiday" {...field} />
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
                <FormLabel>To Date</FormLabel>
                <FormControl>
                  <Input type="date" data-testid="input-to-date-holiday" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="totalHolidays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Days</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  data-testid="input-total-holidays"
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
            data-testid="button-submit-holiday"
          >
            {isLoading ? "Creating..." : "Create Holiday"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
