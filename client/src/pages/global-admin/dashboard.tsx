import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import StatsCard from "@/components/global-admin/dashboard/StatsCard";
import SubscriptionChart from "@/components/global-admin/dashboard/SubscriptionChart";
import PieChart from "@/components/global-admin/dashboard/PieChart";
import LineChart from "@/components/global-admin/dashboard/LineChart";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Percent, 
  Utensils, 
  ClipboardCheck 
} from "lucide-react";

export default function GlobalAdminDashboard() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulated data for the dashboard
  const subscriptionData = [
    { name: 'Jan', trial: 40, subscriber: 24 },
    { name: 'Feb', trial: 45, subscriber: 28 },
    { name: 'Mar', trial: 55, subscriber: 32 },
    { name: 'Apr', trial: 65, subscriber: 37 },
    { name: 'May', trial: 60, subscriber: 42 },
    { name: 'Jun', trial: 80, subscriber: 45 },
  ];

  const subscriptionTypeData = [
    { name: 'Monthly', value: 65 },
    { name: 'Annual', value: 35 },
  ];

  const conversionRateData = [
    { month: 'Jan', rate: 18 },
    { month: 'Feb', rate: 22 },
    { month: 'Mar', rate: 25 },
    { month: 'Apr', rate: 30 },
    { month: 'May', rate: 32 },
    { month: 'Jun', rate: 35 },
  ];

  const churnRateData = [
    { month: 'Jan', rate: 5.2 },
    { month: 'Feb', rate: 4.8 },
    { month: 'Mar', rate: 4.5 },
    { month: 'Apr', rate: 3.9 },
    { month: 'May', rate: 3.5 },
    { month: 'Jun', rate: 3.2 },
  ];
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the global admin portal",
        variant: "destructive",
      });
      setLocation("/global-admin/login");
    } else {
      // Simulate loading dashboard data
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 800);
    }
  }, [toast, setLocation]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <GlobalAdminHeader />
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
            {[...Array(2)].map((_, index) => (
              <div key={index} className="h-80 bg-gray-200 rounded-lg col-span-2"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Trials vs. Subscribers" 
                value="1,245 / 485"
                description="Total active trials & subscribers" 
                icon={<Users className="h-4 w-4" />}
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard 
                title="Annual vs. Monthly" 
                value="35% / 65%"
                description="Subscription type distribution" 
                icon={<TrendingUp className="h-4 w-4" />}
                trend={{ value: 5, isPositive: true }}
              />
              <StatsCard 
                title="Plates Counted" 
                value="12,548"
                description="Total donation counts processed" 
                icon={<Utensils className="h-4 w-4" />}
                trend={{ value: 8, isPositive: true }}
              />
              <StatsCard 
                title="Donations Logged" 
                value="$1,425,392"
                description="Total donation amount processed" 
                icon={<DollarSign className="h-4 w-4" />}
                trend={{ value: 15, isPositive: true }}
              />
            </div>

            {/* Charts - First Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <SubscriptionChart 
                data={subscriptionData}
                title="Trials vs. Subscribers"
                description="Monthly comparison of trials and paid subscribers"
              />
              <PieChart 
                data={subscriptionTypeData}
                title="Annual vs. Monthly"
                description="Distribution of subscription types"
              />
            </div>

            {/* Charts - Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2">
                <LineChart 
                  data={conversionRateData}
                  title="Conversion Rate"
                  description="Monthly trial-to-paid conversion rate"
                  dataKeys={[
                    { key: "rate", name: "Conversion Rate (%)", color: "#69ad4c" }
                  ]}
                  xAxisDataKey="month"
                  yAxisFormatter={(value) => `${value}%`}
                />
              </div>
              <StatsCard 
                title="Conversion Rate" 
                value="35%"
                description="Current trial-to-paid conversion" 
                icon={<Percent className="h-4 w-4" />}
                trend={{ value: 3, isPositive: true }}
                className="h-full"
              />
            </div>

            {/* Charts - Third Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <LineChart 
                  data={churnRateData}
                  title="Churn Rate"
                  description="Monthly subscription churn rate"
                  dataKeys={[
                    { key: "rate", name: "Churn Rate (%)", color: "#ff6b6b" }
                  ]}
                  xAxisDataKey="month"
                  yAxisFormatter={(value) => `${value}%`}
                />
              </div>
              <StatsCard 
                title="Churn Rate" 
                value="3.2%"
                description="Current monthly subscriber churn" 
                icon={<ClipboardCheck className="h-4 w-4" />}
                trend={{ value: 0.3, isPositive: true }}
                className="h-full"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}