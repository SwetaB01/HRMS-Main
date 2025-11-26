import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import Employees from "@/pages/employees";
import Roles from "@/pages/roles";
import Attendance from "@/pages/attendance";
import Leaves from "@/pages/leaves";
import Approvals from "@/pages/approvals";
import Holidays from "@/pages/holidays";
import Reimbursements from "@/pages/reimbursements";
import PayrollPage from "@/pages/payroll";
import CompanySettings from "@/pages/company";
import Reports from "@/pages/reports";

function Router({ currentUser, onLogout }: { currentUser: any; onLogout: () => void }) {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/employees" component={Employees} />
      <Route path="/roles" component={Roles} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/leaves" component={Leaves} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/holidays" component={Holidays} />
      <Route path="/reimbursements" component={Reimbursements} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/company" component={CompanySettings} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in by checking server session
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const user = await response.json();
          console.log('User authenticated:', user);
          setCurrentUser(user);
          setIsAuthenticated(true);
          localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
          // Clear localStorage if session is invalid
          localStorage.removeItem('currentUser');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('currentUser');
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (credentials: { username: string; password: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: "include", // Important: include cookies in request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const user = await response.json();
    console.log('User logged in:', user);
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar currentUser={currentUser} onLogout={handleLogout} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b bg-card">
                <div className="flex items-center gap-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div>
                    <h2 className="text-sm font-medium">MIDCAI HRMS</h2>
                  </div>
                </div>
              </header>
              <main className="flex-1 overflow-auto p-6 bg-background">
                <div className="max-w-7xl mx-auto">
                  <Router currentUser={currentUser} onLogout={handleLogout} />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;