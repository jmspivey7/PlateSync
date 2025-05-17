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
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#69ad4c]" />
              Revenue Tracking
            </CardTitle>
            <CardDescription>
              Track subscription revenue from all paying subscribers
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            <div className="text-center text-gray-500 flex flex-col items-center w-full">
              <div className="w-full h-full flex items-center justify-center flex-col">
                <TrendingUp className="h-12 w-12 mb-3 text-[#69ad4c] opacity-50" />
                <p className="mb-4">Monthly Revenue from Stripe Subscriptions</p>
                <div className="w-full max-w-4xl h-[220px] bg-gray-100 rounded-md p-4 flex items-end justify-between gap-2">
                  <div className="relative h-[70%] w-full max-w-[40px] bg-[#69ad4c] rounded-t-sm">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">$120</span>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs">Jan</span>
                  </div>
                  <div className="relative h-[80%] w-full max-w-[40px] bg-[#69ad4c] rounded-t-sm">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">$175</span>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs">Feb</span>
                  </div>
                  <div className="relative h-[65%] w-full max-w-[40px] bg-[#69ad4c] rounded-t-sm">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">$140</span>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs">Mar</span>
                  </div>
                  <div className="relative h-[90%] w-full max-w-[40px] bg-[#69ad4c] rounded-t-sm">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">$210</span>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs">Apr</span>
                  </div>
                  <div className="relative h-[100%] w-full max-w-[40px] bg-[#69ad4c] rounded-t-sm">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">$250</span>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs">May</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-4">
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