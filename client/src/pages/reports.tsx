import { Download, FileText, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  const reportTypes = [
    {
      title: "Attendance Report",
      description: "Export monthly attendance data for all employees",
      icon: Calendar,
    },
    {
      title: "Leave Summary",
      description: "View leave utilization and balance reports",
      icon: FileText,
    },
    {
      title: "Payroll Report",
      description: "Generate salary summaries and payroll statements",
      icon: Users,
    },
    {
      title: "Reimbursement Report",
      description: "Track expense claims and reimbursement status",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download comprehensive reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <report.icon className="h-5 w-5" />
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {report.description}
              </p>
              <Button className="w-full" data-testid={`button-${report.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
