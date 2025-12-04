
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, AlertCircle, DollarSign, FileText, TrendingUp, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingApprovals: number;
  pendingReimbursements: number;
  pendingRegularizations: number;
}

export default function Dashboard() {
  const { user } = useUser();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Role-based stat cards configuration
  const getStatCards = () => {
    const accessLevel = user?.accessLevel || 'Employee';

    // Admin and HR - Full overview
    if (accessLevel === 'Admin' || accessLevel === 'HR') {
      return [
        {
          title: "Total Employees",
          value: stats?.totalEmployees || 0,
          icon: Users,
          description: "Active in system",
          color: "text-blue-600",
        },
        {
          title: "Present Today",
          value: stats?.presentToday || 0,
          icon: CheckCircle,
          description: "Checked in",
          color: "text-green-600",
        },
        {
          title: "On Leave",
          value: stats?.onLeave || 0,
          icon: Clock,
          description: "Today",
          color: "text-orange-600",
        },
        {
          title: "Pending Approvals",
          value: (stats?.pendingApprovals || 0) + (stats?.pendingReimbursements || 0) + (stats?.pendingRegularizations || 0),
          icon: AlertCircle,
          description: "Requires action",
          color: "text-red-600",
        },
      ];
    }

    // Manager - Team focused
    if (accessLevel === 'Manager') {
      return [
        {
          title: "Team Members",
          value: stats?.totalEmployees || 0,
          icon: Users,
          description: "In your team",
          color: "text-blue-600",
        },
        {
          title: "Team Present",
          value: stats?.presentToday || 0,
          icon: CheckCircle,
          description: "Checked in today",
          color: "text-green-600",
        },
        {
          title: "Pending Approvals",
          value: (stats?.pendingApprovals || 0) + (stats?.pendingReimbursements || 0) + (stats?.pendingRegularizations || 0),
          icon: AlertCircle,
          description: "Requires your action",
          color: "text-red-600",
        },
        {
          title: "Team on Leave",
          value: stats?.onLeave || 0,
          icon: Clock,
          description: "Today",
          color: "text-orange-600",
        },
      ];
    }

    // Accountant - Finance focused
    if (accessLevel === 'Accountant') {
      return [
        {
          title: "Pending Reimbursements",
          value: stats?.pendingReimbursements || 0,
          icon: DollarSign,
          description: "Awaiting approval",
          color: "text-green-600",
        },
        {
          title: "Total Employees",
          value: stats?.totalEmployees || 0,
          icon: Users,
          description: "Active accounts",
          color: "text-blue-600",
        },
        {
          title: "Present Today",
          value: stats?.presentToday || 0,
          icon: CheckCircle,
          description: "For payroll",
          color: "text-green-600",
        },
        {
          title: "Processing Items",
          value: stats?.pendingReimbursements || 0,
          icon: FileText,
          description: "Needs review",
          color: "text-orange-600",
        },
      ];
    }

    // Employee - Personal view
    return [
      {
        title: "My Attendance",
        value: stats?.presentToday ? "Present" : "Absent",
        icon: CheckCircle,
        description: "Today's status",
        color: stats?.presentToday ? "text-green-600" : "text-red-600",
        isText: true,
      },
      {
        title: "Leave Balance",
        value: "-",
        icon: Calendar,
        description: "Check leaves page",
        color: "text-blue-600",
        isText: true,
      },
      {
        title: "Pending Requests",
        value: 0,
        icon: Clock,
        description: "Your submissions",
        color: "text-orange-600",
      },
      {
        title: "Quick Actions",
        value: "-",
        icon: TrendingUp,
        description: "Mark attendance",
        color: "text-purple-600",
        isText: true,
      },
    ];
  };

  const statCards = getStatCards();

  const getWelcomeMessage = () => {
    const accessLevel = user?.accessLevel || 'Employee';
    const name = user?.firstName || 'User';

    switch (accessLevel) {
      case 'Admin':
        return {
          title: `Welcome back, ${name}!`,
          subtitle: "System Overview - Manage your organization",
        };
      case 'HR':
        return {
          title: `Welcome, ${name}!`,
          subtitle: "HR Dashboard - Employee management and oversight",
        };
      case 'Manager':
        return {
          title: `Hello, ${name}!`,
          subtitle: "Team Dashboard - Monitor and approve team activities",
        };
      case 'Accountant':
        return {
          title: `Welcome, ${name}!`,
          subtitle: "Finance Dashboard - Payroll and reimbursement management",
        };
      default:
        return {
          title: `Welcome, ${name}!`,
          subtitle: "Your Personal Dashboard - Track your work activities",
        };
    }
  };

  const welcomeMessage = getWelcomeMessage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">{welcomeMessage.title}</h1>
        <p className="text-muted-foreground">
          {welcomeMessage.subtitle}
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
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(/\s+/g, '-')}-value`}>
                  {stat.isText ? stat.value : stat.value}
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
            <CardTitle>
              {user?.accessLevel === 'Employee' ? 'My Recent Activity' : 'Recent Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              {user?.accessLevel === 'Employee' 
                ? 'Your recent activities will appear here' 
                : 'Recent team activities will appear here'}
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

      {/* Role-specific action section */}
      {user?.accessLevel === 'Employee' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <CheckCircle className="h-5 w-5 mb-2 text-green-600" />
                <p className="font-medium text-sm">Mark Attendance</p>
                <p className="text-xs text-muted-foreground">Check in/out</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Calendar className="h-5 w-5 mb-2 text-blue-600" />
                <p className="font-medium text-sm">Apply Leave</p>
                <p className="text-xs text-muted-foreground">Submit request</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <DollarSign className="h-5 w-5 mb-2 text-green-600" />
                <p className="font-medium text-sm">Reimbursement</p>
                <p className="text-xs text-muted-foreground">Submit claim</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(user?.accessLevel === 'Manager' || user?.accessLevel === 'Admin' || user?.accessLevel === 'HR') && (
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stats?.pendingApprovals || 0) > 0 && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-sm">Leave Approvals Pending</p>
                      <p className="text-xs text-muted-foreground">{stats?.pendingApprovals} requests awaiting review</p>
                    </div>
                  </div>
                </div>
              )}
              {(stats?.pendingReimbursements || 0) > 0 && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Reimbursement Approvals</p>
                      <p className="text-xs text-muted-foreground">{stats?.pendingReimbursements} claims to review</p>
                    </div>
                  </div>
                </div>
              )}
              {(stats?.pendingRegularizations || 0) > 0 && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-sm">Attendance Regularizations</p>
                      <p className="text-xs text-muted-foreground">{stats?.pendingRegularizations} requests pending</p>
                    </div>
                  </div>
                </div>
              )}
              {!stats?.pendingApprovals && !stats?.pendingReimbursements && !stats?.pendingRegularizations && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No pending actions at this time
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
