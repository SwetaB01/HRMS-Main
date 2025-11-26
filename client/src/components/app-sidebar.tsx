import {
  Calendar,
  CalendarDays,
  Home,
  Users,
  Sun,
  Receipt,
  DollarSign,
  Building,
  FileText,
  LogOut,
  LayoutDashboard,
  User,
  CheckSquare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import midcaiLogo from "@assets/Logo Mark_Red_1762255088379.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Employee Management",
    url: "/employees",
    icon: Users,
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: Calendar,
  },
  {
    title: "Leave Management",
    url: "/leaves",
    icon: CalendarDays,
  },
  {
    title: "Holidays",
    url: "/holidays",
    icon: Sun,
  },
  {
    title: "Reimbursements",
    url: "/reimbursements",
    icon: Receipt,
  },
  {
    title: "Payroll",
    url: "/payroll",
    icon: DollarSign,
  },
  {
    title: "Company Settings",
    url: "/company",
    icon: Building,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
];

interface AppSidebarProps {
  currentUser?: {
    firstName: string;
    lastName: string;
    email: string;
    roleName?: string;
    accessLevel?: string;
  } | null;
  onLogout?: () => void;
}

export function AppSidebar({ currentUser, onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  const isAdminOrHR = currentUser?.accessLevel === 'Admin' || currentUser?.accessLevel === 'HR';
  const isManagerOrAdmin = currentUser?.accessLevel === 'Manager' || currentUser?.accessLevel === 'Admin';

  return (
    <Sidebar>
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={midcaiLogo}
            alt="MIDCAI Logo"
            className="h-10 w-10"
          />
          <div>
            <h2 className="text-lg font-semibold">MIDCAI</h2>
            <p className="text-xs text-muted-foreground">Unfolding Perpetually</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/profile"}>
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/roles"}>
                  <Link to="/roles">
                    <Users className="h-4 w-4" />
                    <span>Roles</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isManagerOrAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/approvals"}>
                    <Link href="/approvals">
                      <CheckSquare className="h-4 w-4" />
                      <span>Approvals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {currentUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-sidebar-accent">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentUser.firstName[0]}{currentUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate" data-testid="text-current-user">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser.roleName || 'Employee'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={onLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}