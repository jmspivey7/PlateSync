import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
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
  const [isLoading, setIsLoading] = useState(false);
  
  // State for storing church data - define this first before using in any calculations
  const [churchData, setChurchData] = useState({
    totalChurches: 124,
    activeChurches: 108,
    trialChurches: 78,
    paidChurches: 30,
    annualSubscriptions: 11,
    monthlySubscriptions: 19,
    platesCount: 12548,
    donationsTotal: 1425392
  });
  
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
    
    // Load dashboard data
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
  }, [toast, setLocation]);

  // Define chart data after the state is initialized
  const subscriptionData = [
    { name: 'Jan', trial: 40, subscriber: 24 },
    { name: 'Feb', trial: 45, subscriber: 28 },
    { name: 'Mar', trial: 55, subscriber: 32 },
    { name: 'Apr', trial: 65, subscriber: 37 },
    { name: 'May', trial: 60, subscriber: 42 },
    { name: 'Jun', trial: 80, subscriber: 45 },
  ];

  const subscriptionTypeData = [
    { name: 'Monthly', value: 19 },
    { name: 'Annual', value: 11 },
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

  const COLORS = ["#69ad4c", "#132433", "#8884d8", "#82ca9d"];
  
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
                title="Trials vs. Subscribers" 
                value={`${churchData.trialChurches} / ${churchData.paidChurches}`}
                description="Total active trials & subscribers" 
                icon={<Users className="h-4 w-4" />}
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard 
                title="Annual vs. Monthly" 
                value={`${Math.round(churchData.annualSubscriptions / (churchData.paidChurches || 1) * 100)}% / ${Math.round(churchData.monthlySubscriptions / (churchData.paidChurches || 1) * 100)}%`}
                description="Subscription type distribution" 
                icon={<TrendingUp className="h-4 w-4" />}
                trend={{ value: 5, isPositive: true }}
              />
              <StatsCard 
                title="Plates Counted" 
                value={churchData.platesCount.toLocaleString()}
                description="Total donation counts processed" 
                icon={<Utensils className="h-4 w-4" />}
                trend={{ value: 8, isPositive: true }}
              />
              <StatsCard 
                title="Donations Logged" 
                value={`$${churchData.donationsTotal.toLocaleString()}`}
                description="Total donation amount processed" 
                icon={<DollarSign className="h-4 w-4" />}
                trend={{ value: 15, isPositive: true }}
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Annual vs. Monthly</CardTitle>
                  <CardDescription>Distribution of subscription types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subscriptionTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {subscriptionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts - Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Conversion Rate</CardTitle>
                    <CardDescription>Monthly trial-to-paid conversion rate</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#69ad4c]">35%</div>
                    <div className="text-xs text-muted-foreground">Current conversion</div>
                    <div className="flex items-center justify-end mt-1 text-xs">
                      <span className="text-green-600 mr-1">↑ 3%</span>
                      <span className="text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={conversionRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value: number) => `${value}%`} />
                      <Tooltip formatter={(value: number) => [`${value}%`]} />
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Churn Rate</CardTitle>
                    <CardDescription>Monthly subscription churn rate</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#ff6b6b]">3.2%</div>
                    <div className="text-xs text-muted-foreground">Current churn</div>
                    <div className="flex items-center justify-end mt-1 text-xs">
                      <span className="text-green-600 mr-1">↓ 0.3%</span>
                      <span className="text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={churnRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value: number) => `${value}%`} />
                      <Tooltip formatter={(value: number) => [`${value}%`]} />
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
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}