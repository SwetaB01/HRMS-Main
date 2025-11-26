
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Holiday } from "@shared/schema";
import { HolidayForm } from "@/components/holiday-form";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Holidays() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  // Filter holidays by selected year
  const holidaysForYear = holidays?.filter((holiday) => {
    const holidayYear = new Date(holiday.fromDate).getFullYear();
    return holidayYear === parseInt(selectedYear);
  }) || [];

  // Get unique years from holidays, plus current year and next 2 years
  const currentYear = new Date().getFullYear();
  const yearsFromHolidays = holidays?.map(h => new Date(h.fromDate).getFullYear()) || [];
  const availableYears = Array.from(
    new Set([...yearsFromHolidays, currentYear, currentYear + 1, currentYear + 2])
  ).sort();

  // Create a set of dates that have holidays (for calendar highlighting)
  const holidayDates = new Set<string>();
  
  holidaysForYear.forEach((holiday) => {
    const fromDate = new Date(holiday.fromDate);
    const toDate = new Date(holiday.toDate);
    
    // Add all dates in the holiday range to the set
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      holidayDates.add(dateStr);
    }
  });

  // Get holidays for selected month (ensure no duplicates)
  const holidaysForMonth = Array.from(
    new Map(
      holidaysForYear
        .filter((holiday) => {
          const fromDate = new Date(holiday.fromDate);
          const toDate = new Date(holiday.toDate);
          const fromMonth = fromDate.getMonth();
          const toMonth = toDate.getMonth();
          
          // Include holiday if it starts or ends in the selected month
          return fromMonth === selectedMonth || toMonth === selectedMonth;
        })
        .map((holiday) => [holiday.id, holiday])
    ).values()
  );

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1">Holiday Management</h1>
          <p className="text-muted-foreground">
            Manage company holidays and calendars
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-holiday">
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
              <DialogDescription>
                Create a new holiday entry
              </DialogDescription>
            </DialogHeader>
            <HolidayForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Calendar</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Holiday Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holiday Name</TableHead>
                      <TableHead>From Date</TableHead>
                      <TableHead>To Date</TableHead>
                      <TableHead>Total Days</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-8 w-16 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ) : holidays && holidays.length > 0 ? (
                      Array.from(
                        new Map(
                          holidays.map((holiday) => [holiday.id, holiday])
                        ).values()
                      ).map((holiday) => (
                        <TableRow key={holiday.id} data-testid={`row-holiday-${holiday.id}`}>
                          <TableCell className="font-medium">{holiday.name}</TableCell>
                          <TableCell>{holiday.fromDate}</TableCell>
                          <TableCell>{holiday.toDate}</TableCell>
                          <TableCell>{holiday.totalHolidays}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-edit-${holiday.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-${holiday.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No holidays configured
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Monthly Holiday Calendar</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <Calendar
                  mode="single"
                  month={new Date(parseInt(selectedYear), selectedMonth)}
                  onMonthChange={(date) => {
                    setSelectedMonth(date.getMonth());
                    setSelectedYear(date.getFullYear().toString());
                  }}
                  modifiers={{
                    holiday: (date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      return holidayDates.has(dateStr);
                    }
                  }}
                  modifiersStyles={{
                    holiday: {
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      fontWeight: 'bold'
                    }
                  }}
                  className="rounded-md border"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-4">
                    Holidays in {monthNames[selectedMonth]} {selectedYear}
                  </h3>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : holidaysForMonth.length > 0 ? (
                    <div className="space-y-3">
                      {holidaysForMonth.map((holiday) => (
                        <div
                          key={holiday.id}
                          className="p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{holiday.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {holiday.fromDate === holiday.toDate
                                  ? new Date(holiday.fromDate).toLocaleDateString('en-US', { 
                                      month: 'long', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  : `${new Date(holiday.fromDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })} - ${new Date(holiday.toDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}`
                                }
                              </p>
                            </div>
                            <span className="text-sm font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                              {holiday.totalHolidays} {holiday.totalHolidays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No holidays in this month
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Yearly Holiday Overview</CardTitle>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthNames.map((month, index) => {
                    const monthHolidays = holidaysForYear.filter((holiday) => {
                      const holidayMonth = new Date(holiday.fromDate).getMonth();
                      return holidayMonth === index;
                    });
                    
                    const totalDays = monthHolidays.reduce((sum, h) => sum + h.totalHolidays, 0);

                    return (
                      <Card key={index} className="overflow-hidden">
                        <div className="bg-primary/5 p-3 border-b">
                          <h3 className="font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {month}
                            </span>
                            {totalDays > 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {totalDays} {totalDays === 1 ? 'day' : 'days'}
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="p-3">
                          {monthHolidays.length > 0 ? (
                            <div className="space-y-2">
                              {monthHolidays.map((holiday) => (
                                <div
                                  key={holiday.id}
                                  className="text-sm p-2 bg-accent/50 rounded"
                                >
                                  <div className="font-medium">{holiday.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(holiday.fromDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                    {holiday.fromDate !== holiday.toDate && (
                                      <> - {new Date(holiday.toDate).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}</>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-6">
                              No holidays
                            </p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {!isLoading && holidaysForYear.length > 0 && (
                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Holidays in {selectedYear}:</span>
                    <span className="text-2xl font-bold text-primary">
                      {holidaysForYear.reduce((sum, h) => sum + h.totalHolidays, 0)} days
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
