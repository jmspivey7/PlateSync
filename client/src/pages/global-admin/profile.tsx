import { useEffect } from "react";
import { useLocation } from "wouter";
import GlobalAdminAccountDropdown from "@/components/global-admin/GlobalAdminAccountDropdown";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Avatar,
  AvatarFallback
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export default function GlobalAdminProfile() {
  const [_, setLocation] = useLocation();
  
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
          <div className="flex-1">
            <img 
              src="/logo-with-text.png" 
              alt="PlateSync Logo" 
              className="h-10 object-contain" 
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold text-[#69ad4c]">Global Administration</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <GlobalAdminAccountDropdown 
              adminName="John Spivey" 
              adminEmail="jspivey@spiveyco.com" 
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Global Administrator Profile</h2>
            <Button 
              variant="outline" 
              className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
              onClick={() => setLocation("/global-admin/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center mb-6 gap-4">
                <div>
                  <Avatar className="w-24 h-24 border-2 border-[#69ad4c]">
                    <AvatarFallback className="bg-[#69ad4c] text-white text-xl">JS</AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold">John Spivey</h3>
                  <p className="text-muted-foreground">Global Administrator</p>
                  
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-sm"
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      Upload profile picture
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Spivey" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="jspivey@spiveyco.com" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-[#69ad4c] hover:bg-[#5a9740]">Save Changes</Button>
          </div>
        </div>
      </main>
    </div>
  );
}