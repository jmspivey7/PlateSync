import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import GlobalAdminAccountDropdown from "@/components/global-admin/GlobalAdminAccountDropdown";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  BarChart3,
  Users,
  Building2,
  Calendar,
  LineChart
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
      <header className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo-with-text.png" 
              alt="PlateSync Logo" 
              className="h-10 object-contain" 
            />
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <h1 className="text-xl font-semibold text-[#69ad4c]">Global Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-300"
              onClick={() => setLocation("/global-admin/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
            <GlobalAdminAccountDropdown 
              adminName="John Spivey" 
              adminEmail="jspivey@spiveyco.com" 
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <FileText className="h-7 w-7 text-[#69ad4c] mr-3" />
          <h2 className="text-2xl font-bold">System Reports</h2>
        </div>
        
        <div className="flex justify-between items-center mb-6">
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
          
          <Button variant="outline" className="space-x-2">
            <Download className="h-4 w-4" />
            <span>Export All Reports</span>
          </Button>
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="churches">Churches</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Church Growth</CardTitle>
                  <CardDescription>New church registrations over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-gray-500 flex flex-col items-center">
                    <LineChart className="h-10 w-10 mb-3 text-[#69ad4c] opacity-50" />
                    <p>Chart visualization would appear here</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Activity</CardTitle>
                  <CardDescription>Daily active churches and users</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-gray-500 flex flex-col items-center">
                    <BarChart3 className="h-10 w-10 mb-3 text-[#69ad4c] opacity-50" />
                    <p>Chart visualization would appear here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="churches">
            <Card>
              <CardHeader>
                <CardTitle>Church Reports</CardTitle>
                <CardDescription>Detailed reports on church organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-[#69ad4c] opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Church Reports</h3>
                  <p className="max-w-md mx-auto">
                    Select a specific report type and time period to generate detailed reports on church growth, 
                    activity, and donations.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button className="bg-[#69ad4c] hover:bg-[#5a9740]">
                  Generate Report
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Detailed reports on system users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-[#69ad4c] opacity-50" />
                  <h3 className="text-lg font-medium mb-2">User Reports</h3>
                  <p className="max-w-md mx-auto">
                    Generate reports on user activity, role distribution, and registration trends across the system.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button className="bg-[#69ad4c] hover:bg-[#5a9740]">
                  Generate Report
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle>Donation Reports</CardTitle>
                <CardDescription>System-wide donation statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-[#69ad4c] opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Donation Reports</h3>
                  <p className="max-w-md mx-auto">
                    View aggregated donation statistics across all churches in the system.
                    Individual donor information is not available to protect privacy.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button className="bg-[#69ad4c] hover:bg-[#5a9740]">
                  Generate Report
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Reports</CardTitle>
                <CardDescription>Technical performance and usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-[#69ad4c] opacity-50" />
                  <h3 className="text-lg font-medium mb-2">System Reports</h3>
                  <p className="max-w-md mx-auto">
                    Generate technical reports on system performance, API usage, and error statistics
                    to help maintain optimal service levels.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button className="bg-[#69ad4c] hover:bg-[#5a9740]">
                  Generate Report
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}