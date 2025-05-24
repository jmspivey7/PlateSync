import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
const formatDollar = (value: number) => `$${value.toLocaleString()}`;

// Format month names
const formatMonth = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

export default function GlobalAdminReports() {
  const [_, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  
  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      setLocation("/global-admin/login");
    }
  }, [setLocation]);

  // Fetch real reports data
  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ["/api/global-admin/reports/analytics", selectedPeriod],
    queryFn: async () => {
      const token = localStorage.getItem("globalAdminToken");
      const response = await fetch(`/api/global-admin/reports/analytics?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch reports data');
      return response.json();
    }
  });

  // Transform revenue data for the chart
  const revenueData = useMemo(() => {
    if (!reportsData?.revenueData) return [];
    
    // Group by month and combine monthly/annual data
    const monthlyData: { [key: string]: { month: string, monthly: number, annual: number } } = {};
    
    reportsData.revenueData.forEach((item: any) => {
      const monthKey = formatMonth(item.month);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, monthly: 0, annual: 0 };
      }
      
      if (item.plan === 'MONTHLY') {
        monthlyData[monthKey].monthly = parseFloat(item.revenue) || 0;
      } else if (item.plan === 'ANNUAL') {
        monthlyData[monthKey].annual = parseFloat(item.revenue) || 0;
      }
    });
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [reportsData]);

  // Calculate month-over-month revenue percentage change
  const revenuePercentageChange = useMemo(() => {
    if (revenueData.length < 2) return "0.00";
    
    const currentMonth = revenueData[revenueData.length - 1];
    const previousMonth = revenueData[revenueData.length - 2];
    
    const currentTotal = currentMonth.monthly + currentMonth.annual;
    const previousTotal = previousMonth.monthly + previousMonth.annual;
    
    if (previousTotal === 0) {
      return currentTotal > 0 ? "100.00" : "0.00";
    }
    
    const percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    return percentChange.toFixed(2);
  }, [revenueData]);

  // Download Excel report functions
  const downloadReport = async (reportType: 'churches' | 'users' | 'revenue') => {
    try {
      setDownloadingReport(reportType);
      const token = localStorage.getItem("globalAdminToken");
      
      const response = await fetch(`/api/global-admin/reports/export/${reportType}?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-report-${selectedPeriod}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloadingReport(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#69ad4c] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load reports data</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

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
              <div className="text-3xl font-bold">
                {parseInt(reportsData?.churchStats?.total_churches) || 0}
              </div>
              <p className="text-sm text-green-600 flex items-center mt-1">
                +{parseInt(reportsData?.churchStats?.new_churches) || 0} from previous period
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => downloadReport('churches')}
                disabled={downloadingReport === 'churches'}
              >
                {downloadingReport === 'churches' ? (
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-2" />
                )}
                {downloadingReport === 'churches' ? 'Generating...' : 'Download Report'}
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
              <div className="text-3xl font-bold">
                {parseInt(reportsData?.userStats?.total_users) || 0}
              </div>
              <p className="text-sm text-green-600 flex items-center mt-1">
                +{parseInt(reportsData?.userStats?.new_users) || 0} from previous period
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => downloadReport('users')}
                disabled={downloadingReport === 'users'}
              >
                {downloadingReport === 'users' ? (
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-2" />
                )}
                {downloadingReport === 'users' ? 'Generating...' : 'Download Report'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>Total Revenue</span>
                <DollarSign className="h-5 w-5 text-[#69ad4c]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatDollar(
                  reportsData?.subscriptionSummary?.reduce((total: number, sub: any) => 
                    total + (parseFloat(sub.total_revenue) || 0), 0
                  ) || 0
                )}
              </div>
              <p className="text-sm text-green-600 flex items-center mt-1">
                Revenue for selected period
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => downloadReport('revenue')}
                disabled={downloadingReport === 'revenue'}
              >
                {downloadingReport === 'revenue' ? (
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-2" />
                )}
                {downloadingReport === 'revenue' ? 'Generating...' : 'Download Report'}
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
              <div className={`flex items-center gap-1 text-sm font-medium ${
                parseFloat(revenuePercentageChange) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>
                  {parseFloat(revenuePercentageChange) >= 0 ? '+' : ''}{revenuePercentageChange}%
                </span>
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
            <Button 
              className="bg-[#69ad4c] hover:bg-[#5a9740] text-white"
              onClick={() => downloadReport('revenue')}
              disabled={downloadingReport === 'revenue'}
            >
              {downloadingReport === 'revenue' ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {downloadingReport === 'revenue' ? 'Generating Revenue Report...' : 'Download Revenue Report'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}