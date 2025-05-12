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
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, Mail, Phone, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function GlobalAdminHelp() {
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <HelpCircle className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">Help & Support</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Access comprehensive guides and documentation for PlateSync's Global Admin features.
                </p>
                <Button className="w-full bg-[#69ad4c] hover:bg-[#5a9740]">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Email Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Reach our support team via email for non-urgent inquiries and feature requests.
                </p>
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  support@platesync.com
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Phone Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  For urgent matters, call our dedicated global administrator support line.
                </p>
                <Button variant="outline" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  (555) 123-4567
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions about the Global Admin features</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I add a new church organization?</AccordionTrigger>
                  <AccordionContent>
                    To add a new church organization, navigate to the Churches dashboard and click the "Add Church" button. 
                    Fill in the required information and submit the form. The new church will be created with a default 
                    status of "Pending" until you activate it.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>How do I manage church administrators?</AccordionTrigger>
                  <AccordionContent>
                    You can manage church administrators by clicking on a church from the dashboard, then navigating to the 
                    "Users" tab. From there, you can add new administrators, change roles, or deactivate existing users.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I suspend a church organization?</AccordionTrigger>
                  <AccordionContent>
                    To suspend a church organization, go to the church detail page and click on the "Status" dropdown. 
                    Select "Suspended" and confirm your action. This will prevent all users of that church from accessing 
                    the system until you reactivate it.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I access donation data for individual churches?</AccordionTrigger>
                  <AccordionContent>
                    As a Global Administrator, you have access to aggregated donation statistics for each church, but not 
                    individual donation records. This is to maintain privacy and data separation between church organizations.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger>How do I generate global system reports?</AccordionTrigger>
                  <AccordionContent>
                    To generate global system reports, navigate to the "Reports" section from the main menu. There you can 
                    select from various report types including usage statistics, church activity, and system performance. 
                    Reports can be exported in CSV or PDF format.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}