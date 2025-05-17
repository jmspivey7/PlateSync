import React, { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon, Mail, Network, Edit } from "lucide-react";

// Import the integration logos
import sendgridLogo from "../../assets/integrations/sendgrid-logo.png";
import stripeLogo from "../../assets/integrations/stripe-logo.png";
import planningCenterLogo from "../../assets/integrations/planning-center-logo.png";

type TemplateType = "WELCOME_EMAIL" | "PASSWORD_RESET";

interface EmailTemplate {
  id: number;
  type: TemplateType;
  subject: string;
  lastUpdated?: string;
}

// Pre-defined system email templates
const systemTemplates: EmailTemplate[] = [
  {
    id: 1,
    type: "WELCOME_EMAIL",
    subject: "Welcome to PlateSync",
    lastUpdated: "May 10, 2025, 2:30 PM"
  },
  {
    id: 2,
    type: "PASSWORD_RESET",
    subject: "Reset Your PlateSync Password",
    lastUpdated: "May 12, 2025, 11:15 AM"
  }
];

export default function GlobalAdminSettings() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [templates] = useState<EmailTemplate[]>(systemTemplates);

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalAdminHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SettingsIcon className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">System Settings</h2>
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
        
        <Tabs defaultValue="email-templates" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="email-templates" className="text-sm">Email Templates</TabsTrigger>
            <TabsTrigger value="integrations" className="text-sm">Integrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email-templates">
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-[#69ad4c]" />
                  <CardTitle>System Email Templates</CardTitle>
                </div>
                <CardDescription>
                  Configure the email templates used system-wide for all churches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div 
                      key={template.id} 
                      className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group p-4 flex items-center justify-between"
                      onClick={() => setLocation(`/global-admin/edit-email-template/${template.id}`)}
                    >
                      <div>
                        <h3 className="font-medium">
                          {template.type === "WELCOME_EMAIL" ? "Welcome Email" : "Password Reset"}
                        </h3>
                        <p className="text-sm text-gray-500">{template.subject}</p>
                        {template.lastUpdated && (
                          <p className="text-xs text-gray-400 mt-1">
                            Last edited: {template.lastUpdated}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Network className="text-[#69ad4c] h-5 w-5" />
                  <CardTitle className="text-2xl font-bold">Integrations</CardTitle>
                </div>
                <CardDescription>
                  Configure system-wide integrations for all churches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div 
                    className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
                    onClick={() => setLocation("/global-admin/integrations/stripe")}
                  >
                    <div className="flex items-center gap-6">
                      <img 
                        src={stripeLogo} 
                        alt="Stripe" 
                        className="h-10"
                      />
                      <p className="text-base text-gray-700">Configure subscription and payment settings</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                    
                  <div 
                    className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
                    onClick={() => setLocation("/global-admin/integrations/sendgrid")}
                  >
                    <div className="flex items-center gap-6">
                      <img 
                        src={sendgridLogo} 
                        alt="SendGrid" 
                        className="h-10"
                      />
                      <p className="text-base text-gray-700">Configure email delivery settings</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div 
                    className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
                    onClick={() => setLocation("/global-admin/integrations/planning-center")}
                  >
                    <div className="flex items-center gap-6">
                      <img 
                        src={planningCenterLogo} 
                        alt="Planning Center" 
                        className="h-10"
                      />
                      <p className="text-base text-gray-700">Configure member synchronization</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}