import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
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
import LoginLocal from "@/pages/login-local";
import Verify from "@/pages/verify";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Onboarding from "@/pages/onboarding";
import Counts from "@/pages/counts";
import BatchDetail from "@/pages/batch-detail";
import BatchSummary from "@/pages/batch-summary"; // New dedicated component
import AttestBatch from "@/pages/attest-batch";
import PrintReport from "@/pages/print-report";
import Profile from "@/pages/profile";
import Help from "@/pages/help";
import UserManagement from "@/pages/user-management";
import ServiceOptions from "@/pages/service-options";
import EmailSettings from "@/pages/email-settings";
import EmailTemplateEditor from "@/pages/email-template-editor";

// Global Admin pages
import GlobalAdminLogin from "@/pages/global-admin/login";
import GlobalAdminDashboard from "@/pages/global-admin/dashboard";
import ChurchDetail from "@/pages/global-admin/church-detail";

import { useAuth } from "@/hooks/useAuth";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login", 
  "/login-local", 
  "/verify", 
  "/forgot-password", 
  "/reset-password", 
  "/onboarding",
  "/global-admin/login"
];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [redirectInProgress, setRedirectInProgress] = useState(false);
  
  // Check authentication and redirect if needed
  useEffect(() => {
    if (isLoading || redirectInProgress) return;
    
    const currentPathIsPublic = isPublicPath(location);
    
    if (!user && !currentPathIsPublic) {
      setRedirectInProgress(true);
      setLocation("/login-local");
    } else if (user && currentPathIsPublic && location !== "/verify") {
      // If user is logged in and on a public page (except verify), redirect to dashboard
      setRedirectInProgress(true);
      setLocation("/dashboard");
    } else {
      setRedirectInProgress(false);
    }
  }, [user, isLoading, location, setLocation, redirectInProgress]);
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#69ad4c]" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/login-local" component={LoginLocal} />
      <Route path="/verify" component={Verify} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/onboarding" component={Onboarding} />
      
      {/* Protected routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/donations" component={Donations} />
      <Route path="/members" component={Members} />
      <Route path="/counts" component={Counts} />
      <Route path="/batch/:id" component={BatchDetail} />
      <Route path="/batch-summary/:id" component={BatchSummary} />
      <Route path="/attest-batch/:id" component={AttestBatch} />
      <Route path="/print-report" component={PrintReport} />
      
      {/* Account and Settings Pages */}
      <Route path="/profile" component={Profile} />
      <Route path="/help" component={Help} />
      <Route path="/settings" component={Settings} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/service-options" component={ServiceOptions} />
      <Route path="/email-settings" component={EmailSettings} />

      <Route path="/email-template/:id" component={EmailTemplateEditor} />
      
      {/* Global Admin Routes */}
      <Route path="/global-admin/login" component={GlobalAdminLogin} />
      <Route path="/global-admin/dashboard" component={GlobalAdminDashboard} />
      <Route path="/global-admin/churches/:id" component={ChurchDetail} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Don't show header/footer on public pages
  const currentPathIsPublic = isPublicPath(location);
  
  if (!user || currentPathIsPublic) {
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