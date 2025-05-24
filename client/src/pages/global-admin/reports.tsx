import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  BarChart3,
  Users,
  Building2,
  DollarSign,
  TrendingUp
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Revenue tracking data for the bar chart
const revenueData = [
  { month: "Jan", monthly: 120, annual: 45 },
  { month: "Feb", monthly: 175, annual: 60 },
  { month: "Mar", monthly: 140, annual: 90 },
  { month: "Apr", monthly: 210, annual: 120 },
  { month: "May", monthly: 250, annual: 150 },
  { month: "Jun", monthly: 300, annual: 170 },
];

// Configuration for the revenue chart with our green color scheme
const chartConfig = {
  monthly: {
    label: "Monthly Subscriptions",
    color: "#69ad4c",
  },
  annual: {
    label: "Annual Subscriptions",
    color: "#132433",
  },
} satisfies ChartConfig;

// Format dollar values for display
const formatDollar = (value: number) => `$${value}`;

export default function GlobalAdminReports() {
  const [_, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  
  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      setLocation("/global-admin/login");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <GlobalAdminHeader />
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FileText className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">System Reports</h2>
          </div>
          <Button 
            variant="outline" 
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="flex justify-start items-center mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Time Period:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Overview</h2>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>Total Churches</span>
                <Building2 className="h-5 w-5 text-[#69ad4c]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">127</div>
              <p className="text-sm text-green-600 flex items-center mt-1">
                +12 from previous period
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-3">
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-3.5 w-3.5 mr-2" />
                Download Report
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>Total Users</span>
                <Users className="h-5 w-5 text-[#69ad4c]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">1,452</div>
              <p className="text-sm text-green-600 flex items-center mt-1">
                +87 from previous period
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-3">
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-3.5 w-3.5 mr-2" />
                Download Report
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>Total Donations</span>
                <BarChart3 className="h-5 w-5 text-[#69ad4c]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$2.4M</div>
              <p className="text-sm text-green-600 flex items-center mt-1">
                +14% from previous period
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-3">
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-3.5 w-3.5 mr-2" />
                Download Report
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Revenue Tracking Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#69ad4c]" />
                Revenue Tracking
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <span>+16.7%</span>
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardTitle>
            <CardDescription>
              Track subscription revenue from all paying subscribers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-0">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontWeight: 'bold', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={<ChartTooltipContent 
                      valueFormatter={formatDollar} 
                    />} 
                  />
                  <Legend 
                    content={<ChartLegendContent />}
                    verticalAlign="bottom" 
                    height={36}
                  />
                  <Bar 
                    dataKey="monthly" 
                    fill="var(--color-monthly)" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30}
                  />
                  <Bar 
                    dataKey="annual" 
                    fill="var(--color-annual)" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex justify-center pb-4 pt-0">
            <Button className="bg-[#69ad4c] hover:bg-[#5a9740] text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Revenue Report
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}