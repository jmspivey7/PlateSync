import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon, Mail, Network, Edit } from "lucide-react";

// Import the integration logos
import sendgridLogo from "../../assets/integrations/sendgrid-logo.png";
import stripeLogo from "../../assets/integrations/stripe-logo.png";
import planningCenterLogo from "../../assets/integrations/planning-center-logo.png";
const awsS3Logo = "/images/integrations/aws-s3-logo.png";

interface EmailTemplate {
  id: number;
  templateType: string;
  subject: string;
  lastUpdated?: string;
}

export default function GlobalAdminSettings() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("email-templates");

  // Check URL parameters for tab switching
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'integrations') {
      setActiveTab('integrations');
    } else {
      setActiveTab('email-templates');
    }
  }, []);

  // For now, use hardcoded template IDs that we know work
  const templates = [
    {
      id: 32,
      templateType: "EMAIL_VERIFICATION",
      subject: "Verify Your PlateSync Account",
    },
    {
      id: 30,
      templateType: "WELCOME_EMAIL",
      subject: "Welcome to PlateSync",
    },
    {
      id: 31,
      templateType: "PASSWORD_RESET", 
      subject: "Reset Your PlateSync Password",
    }
  ];
  
  const templatesLoading = false;

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalAdminHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SettingsIcon className="h-7 w-7 text-[#d35f5f] mr-3" />
            <h2 className="text-2xl font-bold">System Settings</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#d35f5f] text-[#d35f5f] hover:bg-[#d35f5f]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="email-templates" className="text-sm">Email Templates</TabsTrigger>
            <TabsTrigger value="integrations" className="text-sm">Integrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email-templates">
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-[#d35f5f]" />
                  <CardTitle>System Email Templates</CardTitle>
                </div>
                <CardDescription>
                  Configure the email templates used system-wide for all churches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d35f5f]"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div 
                        key={template.id} 
                        className="border rounded-md overflow-hidden hover:border-[#d35f5f] hover:shadow-sm transition-all duration-200 cursor-pointer group p-4 flex items-center justify-between"
                        onClick={() => {
                          console.log('Clicking template:', template.id, template.templateType);
                          setLocation(`/global-admin/edit-email-template/${template.id}`);
                        }}
                      >
                        <div>
                          <h3 className="font-medium">
                            {template.templateType === "WELCOME_EMAIL" ? "Welcome Email" : 
                             template.templateType === "PASSWORD_RESET" ? "Password Reset" : 
                             template.templateType === "EMAIL_VERIFICATION" ? "Email Verification" : 
                             template.templateType}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Network className="text-[#d35f5f] h-5 w-5" />
                  <CardTitle className="text-2xl font-bold">Integrations</CardTitle>
                </div>
                <CardDescription>
                  Configure system-wide integrations for all churches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div 
                    className="border rounded-md overflow-hidden hover:border-[#d35f5f] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
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
                    className="border rounded-md overflow-hidden hover:border-[#d35f5f] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
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
                    className="border rounded-md overflow-hidden hover:border-[#d35f5f] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
                    onClick={() => setLocation("/global-admin/integrations/aws-s3")}
                  >
                    <div className="flex items-center gap-6">
                      <img 
                        src={awsS3Logo} 
                        alt="AWS S3" 
                        className="h-10"
                      />
                      <p className="text-base text-gray-700">Configure remote storage</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div 
                    className="border rounded-md overflow-hidden hover:border-[#d35f5f] hover:shadow-sm transition-all duration-200 cursor-pointer group p-6 flex items-center justify-between"
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