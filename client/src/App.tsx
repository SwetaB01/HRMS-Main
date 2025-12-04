import { Switch, Route } from "wouter";
import { useState, useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2 } from "lucide-react";

// Only import login page directly (needed before auth)
import LoginPage from "@/pages/login";

// Lazy load all other pages for better performance
const Dashboard = lazy(() => import("@/pages/dashboard"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const Employees = lazy(() => import("@/pages/employees"));
const Roles = lazy(() => import("@/pages/roles"));
const Attendance = lazy(() => import("@/pages/attendance"));
const Leaves = lazy(() => import("@/pages/leaves"));
const Approvals = lazy(() => import("@/pages/approvals"));
const Holidays = lazy(() => import("@/pages/holidays"));
const Reimbursements = lazy(() => import("./pages/reimbursements"));
const PayrollPage = lazy(() => import("@/pages/payroll"));
const CompanySettings = lazy(() => import("@/pages/company"));
const Reports = lazy(() => import("@/pages/reports"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading spinner component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router({ currentUser, onLogout }: { currentUser: any; onLogout: () => void }) {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
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

    // Clear any cached data
    queryClient.clear();
    localStorage.setItem('currentUser', JSON.stringify(user));

    // Force a full page refresh to clear all state
    window.location.href = '/';
  };

  const handleLogout = async () => {
    // Call logout endpoint to clear server session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    // Clear all cached data
    queryClient.clear();
    localStorage.removeItem('currentUser');

    // Force a full page refresh to clear all state
    window.location.href = '/';
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