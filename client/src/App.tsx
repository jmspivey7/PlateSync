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
import Subscription from "@/pages/subscription";
import SubscriptionPage from "@/pages/subscription-page";

// Global Admin pages
import GlobalAdminLogin from "@/pages/global-admin/login";
import GlobalAdminDashboard from "@/pages/global-admin/dashboard";
import GlobalAdminChurches from "@/pages/global-admin/churches";
import ChurchDetail from "@/pages/global-admin/church-detail";
import GlobalAdminProfile from "@/pages/global-admin/profile";
import GlobalAdminUsers from "@/pages/global-admin/users";
import GlobalAdminReports from "@/pages/global-admin/reports";
import GlobalAdminSettings from "@/pages/global-admin/simplified-settings";
import EditEmailTemplate from "@/pages/global-admin/edit-email-template";

// Global Admin Integration Pages
import SendGridIntegration from "@/pages/global-admin/integrations/sendgrid";
import PlanningCenterIntegration from "@/pages/global-admin/integrations/planning-center";
import StripeIntegration from "@/pages/global-admin/integrations/stripe";
import StripeTestPage from "@/pages/global-admin/integrations/stripe-test";

import { useAuth } from "@/hooks/useAuth";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login", 
  "/login-local", 
  "/verify", 
  "/forgot-password", 
  "/reset-password", 
  "/onboarding"
];

// Global Admin paths are handled separately
const GLOBAL_ADMIN_PATHS = [
  "/global-admin/login",
  "/global-admin/dashboard",
  "/global-admin/churches",
  "/global-admin/church/",  // Updated to support all church detail pages with trailing slash
  "/global-admin/profile",
  "/global-admin/users",
  "/global-admin/reports",
  "/global-admin/settings",  // Added settings path
  "/global-admin/integrations", // Added for integrations pages
  "/global-admin/edit-email-template", // Added for email template editing
];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));
}

function isGlobalAdminPath(path: string) {
  // Simpler approach: any path that starts with /global-admin/ is considered a global admin path
  return path.startsWith('/global-admin/');
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [redirectInProgress, setRedirectInProgress] = useState(false);
  
  // Check authentication and redirect if needed
  useEffect(() => {
    if (isLoading || redirectInProgress) return;
    
    // Skip authentication checks for Global Admin paths
    if (isGlobalAdminPath(location)) {
      setRedirectInProgress(false);
      return;
    }
    
    const currentPathIsPublic = isPublicPath(location);
    console.log('Auth check:', { 
      currentPath: location, 
      isPublicPath: currentPathIsPublic, 
      isAuthenticated: !!user,
      redirectInProgress
    });
    
    try {
      if (!user && !currentPathIsPublic) {
        // User is not authenticated and trying to access a protected route
        console.log('Redirecting unauthenticated user to login page');
        setRedirectInProgress(true);
        setTimeout(() => {
          setLocation("/login-local"); 
          setRedirectInProgress(false);
        }, 100);
      } else if (user && currentPathIsPublic && location !== "/verify") {
        // User is authenticated and trying to access a public page (except verify)
        console.log('Redirecting authenticated user to dashboard');
        setRedirectInProgress(true);
        setTimeout(() => {
          setLocation("/dashboard");
          setRedirectInProgress(false);
        }, 100);
      } else {
        setRedirectInProgress(false);
      }
    } catch (error) {
      console.error('Error during authentication redirect:', error);
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
      <Route path="/subscription" component={SubscriptionPage} />

      <Route path="/email-template/:id" component={EmailTemplateEditor} />
      
      {/* Global Admin Routes */}
      <Route path="/global-admin/login" component={GlobalAdminLogin} />
      <Route path="/global-admin/dashboard" component={GlobalAdminDashboard} />
      <Route path="/global-admin/churches" component={GlobalAdminChurches} />
      <Route path="/global-admin/church/:id" component={ChurchDetail} />
      <Route path="/global-admin/profile" component={GlobalAdminProfile} />
      <Route path="/global-admin/users" component={GlobalAdminUsers} />
      <Route path="/global-admin/reports" component={GlobalAdminReports} />
      <Route path="/global-admin/settings" component={GlobalAdminSettings} />
      <Route path="/global-admin/edit-email-template/:id">
        <EditEmailTemplate />
      </Route>
      
      {/* Global Admin Integration Routes */}
      <Route path="/global-admin/integrations/sendgrid" component={SendGridIntegration} />
      <Route path="/global-admin/integrations/planning-center" component={PlanningCenterIntegration} />
      <Route path="/global-admin/integrations/stripe" component={StripeIntegration} />
      <Route path="/global-admin/integrations/stripe-test" component={StripeTestPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Don't show header/footer on public pages or global admin pages
  const currentPathIsPublic = isPublicPath(location);
  const isGlobalAdmin = isGlobalAdminPath(location);
  
  if (!user || currentPathIsPublic || isGlobalAdmin) {
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