import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Percent, 
  Utensils, 
  ClipboardCheck 
} from "lucide-react";

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon?: React.ReactNode; 
  trend?: { value: number; isPositive: boolean; }; 
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-[#69ad4c]">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
        {trend && (
          <div className="flex items-center mt-1 text-xs">
            <span className={trend.isPositive ? "text-green-600 mr-1" : "text-red-600 mr-1"}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function GlobalAdminDashboard() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
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
      return;
    }
  }, [toast, setLocation]);

  // Fetch real dashboard analytics data
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['/api/global-admin/dashboard/analytics'],
    queryFn: async () => {
      const token = localStorage.getItem("globalAdminToken");
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/api/global-admin/dashboard/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    retry: false,
  });

  // Process real data or show empty state when no data available
  const formatMonth = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' });
  };

  // Transform subscription trends data for charts
  const subscriptionData = analytics?.subscriptionTrends?.map((trend: any) => ({
    name: formatMonth(trend.month),
    trial: parseInt(trend.trial_count) || 0,
    subscriber: parseInt(trend.paid_count) || 0,
  })) || [];

  // Transform conversion rate data
  const conversionData = analytics?.conversionRates?.map((rate: any) => ({
    month: formatMonth(rate.month),
    rate: rate.trial_starts > 0 ? ((parseInt(rate.conversions) / parseInt(rate.trial_starts)) * 100).toFixed(1) : 0
  })) || [];

  // Transform churn rate data
  const churnData = analytics?.churnRates?.map((rate: any) => ({
    month: formatMonth(rate.month),
    rate: rate.total_paid > 0 ? ((parseInt(rate.churned) / parseInt(rate.total_paid)) * 100).toFixed(1) : 0
  })) || [];

  // Subscription type breakdown from real data
  const subscriptionTypeData = [
    { name: 'Monthly', value: parseInt(analytics?.subscriptionStats?.monthly_subscriptions) || 0 },
    { name: 'Annual', value: parseInt(analytics?.subscriptionStats?.annual_subscriptions) || 0 },
  ];

  const COLORS = ["#69ad4c", "#132433", "#8884d8", "#82ca9d"];

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalAdminHeader />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to Load Dashboard</h2>
            <p className="text-gray-600">Unable to fetch analytics data. Please try refreshing the page.</p>
          </div>
        </main>
      </div>
    );
  }
  
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
              <div key={`chart-${index}`} className="h-80 bg-gray-200 rounded-lg col-span-2"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Total Churches" 
                value={analytics?.churchStats?.total_churches || 0}
                description={`${analytics?.churchStats?.active_churches || 0} active churches`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatsCard 
                title="Subscriptions" 
                value={`${analytics?.subscriptionStats?.trial_active || 0} trial / ${(analytics?.subscriptionStats?.monthly_subscriptions || 0) + (analytics?.subscriptionStats?.annual_subscriptions || 0)} paid`}
                description="Trial vs paid subscriptions" 
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatsCard 
                title="Donation Batches" 
                value={analytics?.batchStats?.total_batches || 0}
                description={`${analytics?.batchStats?.finalized_batches || 0} finalized this month`}
                icon={<ClipboardCheck className="h-4 w-4" />}
              />
              <StatsCard 
                title="Total Donations" 
                value={`$${(parseFloat(analytics?.donationStats?.total_amount) || 0).toLocaleString()}`}
                description={`${analytics?.donationStats?.total_donations || 0} donations this month`}
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>

            {/* Charts - First Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Trials vs. Subscribers</CardTitle>
                  <CardDescription>Monthly comparison of trials and paid subscribers</CardDescription>
                </CardHeader>
                <CardContent>
                  {subscriptionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={subscriptionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="trial" name="Trials" fill="#69ad4c" />
                        <Bar dataKey="subscriber" name="Subscribers" fill="#132433" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No subscription data available yet</p>
                        <p className="text-sm">Charts will appear as users start subscribing</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Annual vs. Monthly</CardTitle>
                  <CardDescription>Distribution of subscription types</CardDescription>
                </CardHeader>
                <CardContent>
                  {subscriptionTypeData.some(item => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={subscriptionTypeData.filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {subscriptionTypeData.filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No paid subscriptions yet</p>
                        <p className="text-sm">Chart will show when users upgrade to paid plans</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts - Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Conversion Rate</CardTitle>
                    <CardDescription>% of trials that convert to paid subscriptions</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#69ad4c]">
                      {conversionData.length > 0 ? `${conversionData[conversionData.length - 1]?.rate || 0}%` : '0%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Current conversion</div>
                  </div>
                </CardHeader>
                <CardContent>
                  {conversionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={conversionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value: number) => `${value}%`} />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Conversion Rate']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          name="Conversion Rate (%)" 
                          stroke="#69ad4c" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No conversion data available yet</p>
                        <p className="text-sm">Charts will appear as trials convert to paid plans</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Churn Rate</CardTitle>
                    <CardDescription>% of subscribers who cancel or don't renew</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#ff6b6b]">
                      {churnData.length > 0 ? `${churnData[churnData.length - 1]?.rate || 0}%` : '0%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Current churn</div>
                  </div>
                </CardHeader>
                <CardContent>
                  {churnData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={churnData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value: number) => `${value}%`} />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Churn Rate']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          name="Churn Rate (%)" 
                          stroke="#ff6b6b" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Percent className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No churn data available yet</p>
                        <p className="text-sm">Charts will appear as subscription patterns develop</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}