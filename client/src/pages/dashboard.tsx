
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, AlertCircle, Receipt, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "wouter";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingApprovals: number;
  pendingReimbursements: number;
  pendingRegularizations: number;
  myLeaveBalance?: number;
  myReimbursements?: number;
  myAttendance?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: currentUser } = useQuery<{
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

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const isAdmin = currentUser?.accessLevel === 'Admin';
  const isManager = currentUser?.accessLevel === 'Manager';
  const isEmployee = currentUser?.accessLevel === 'Employee';

  // Define role-specific stat cards
  const getStatCards = () => {
    if (isAdmin) {
      return [
        {
          title: "Total Employees",
          value: stats?.totalEmployees || 0,
          icon: Users,
          description: "Active in system",
          onClick: () => navigate("/employees"),
        },
        {
          title: "Present Today",
          value: stats?.presentToday || 0,
          icon: Calendar,
          description: "Checked in",
          onClick: () => navigate("/attendance"),
        },
        {
          title: "On Leave",
          value: stats?.onLeave || 0,
          icon: Clock,
          description: "Today",
          onClick: () => navigate("/leaves"),
        },
        {
          title: "Pending Approvals",
          value: (stats?.pendingApprovals || 0) + (stats?.pendingReimbursements || 0) + (stats?.pendingRegularizations || 0),
          icon: AlertCircle,
          description: "Requires action",
          onClick: () => navigate("/approvals"),
        },
      ];
    } else if (isManager) {
      return [
        {
          title: "My Team",
          value: stats?.totalEmployees || 0,
          icon: Users,
          description: "Team members",
          onClick: () => navigate("/attendance"),
        },
        {
          title: "Present Today",
          value: stats?.presentToday || 0,
          icon: Calendar,
          description: "Team checked in",
          onClick: () => navigate("/attendance"),
        },
        {
          title: "Pending Approvals",
          value: (stats?.pendingApprovals || 0) + (stats?.pendingReimbursements || 0) + (stats?.pendingRegularizations || 0),
          icon: AlertCircle,
          description: "Requires action",
          onClick: () => navigate("/approvals"),
        },
        {
          title: "My Leave Balance",
          value: stats?.myLeaveBalance || 0,
          icon: Clock,
          description: "Days available",
          onClick: () => navigate("/leaves"),
        },
      ];
    } else {
      // Employee view
      return [
        {
          title: "My Attendance",
          value: stats?.myAttendance || 0,
          icon: Calendar,
          description: "Days this month",
          onClick: () => navigate("/attendance"),
        },
        {
          title: "Leave Balance",
          value: stats?.myLeaveBalance || 0,
          icon: Clock,
          description: "Days available",
          onClick: () => navigate("/leaves"),
        },
        {
          title: "My Reimbursements",
          value: stats?.myReimbursements || 0,
          icon: Receipt,
          description: "Pending claims",
          onClick: () => navigate("/reimbursements"),
        },
        {
          title: "Quick Actions",
          value: 3,
          icon: FileText,
          description: "Apply leave/claim",
          onClick: () => navigate("/leaves"),
        },
      ];
    }
  };

  const statCards = getStatCards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin && "Welcome to MIDCAI HRMS - Overview of your organization"}
          {isManager && "Welcome to MIDCAI HRMS - Manage your team"}
          {isEmployee && "Welcome to MIDCAI HRMS - Your personal workspace"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          statCards.map((stat) => (
            <Card 
              key={stat.title} 
              data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(/\s+/g, '-')}-value`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No recent activity to display
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No upcoming holidays
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
