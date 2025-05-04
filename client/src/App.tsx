import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Donations from "@/pages/donations";
import Members from "@/pages/members";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Verify from "@/pages/verify";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Counts from "@/pages/counts";
import BatchDetail from "@/pages/batch-detail";
import AttestBatch from "@/pages/attest-batch";
import Profile from "@/pages/profile";
import Help from "@/pages/help";
import UserManagement from "@/pages/user-management";
import ServiceOptions from "@/pages/service-options";
import EmailSettings from "@/pages/email-settings";
import Reports from "@/pages/reports";

import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Use useEffect for redirect to avoid rendering issues
  useEffect(() => {
    const publicPaths = ["/login", "/verify", "/forgot-password", "/reset-password"];
    const isPublicPath = publicPaths.some(path => location.startsWith(path));
    
    if (!isLoading && !isAuthenticated && !isPublicPath) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);
  
  // Only render routes once authentication check is complete
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4299E1]" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/verify" component={Verify} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/donations" component={Donations} />
      <Route path="/members" component={Members} />
      <Route path="/counts" component={Counts} />
      <Route path="/batch/:id" component={BatchDetail} />
      <Route path="/attest-batch/:id" component={AttestBatch} />
      
      {/* Account and Settings Pages */}
      <Route path="/profile" component={Profile} />
      <Route path="/help" component={Help} />
      <Route path="/settings" component={Settings} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/service-options" component={ServiceOptions} />
      <Route path="/email-settings" component={EmailSettings} />
      <Route path="/reports" component={Reports} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Don't show header/footer on public pages
  const isPublicPath = ["/login", "/verify", "/forgot-password", "/reset-password"].some(path => location.startsWith(path));
  
  if (!isAuthenticated || isPublicPath) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedLayout>
          <Router />
        </AuthenticatedLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
