import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import EmailTemplatePreview from "@/components/global-admin/EmailTemplatePreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Save, 
  Mail, 
  RotateCw, 
  Code, 
  Eye, 
  Loader2,
  Network,
  Edit
} from "lucide-react";

// Define the template types
type TemplateType = "WELCOME_EMAIL" | "PASSWORD_RESET";

interface EmailTemplate {
  id: string;
  type: TemplateType;
  subject: string;
  body: string;
  lastUpdated?: string;
}

// Sample template data with proper HTML templates
const initialTemplates: EmailTemplate[] = [
  {
    id: "1",
    type: "WELCOME_EMAIL",
    subject: "Welcome to PlateSync",
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to PlateSync</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px; }
    .header img { max-width: 150px; }
    .header h1 { color: #333; margin-top: 15px; margin-bottom: 5px; }
    .header p { color: #666; margin-top: 0; }
    .content { padding: 20px; background-color: #f8f8f8; }
    .section { background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .button { display: inline-block; background-color: #69ad4c; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 15px 0; }
    .button:hover { background-color: #5a9440; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; padding: 20px; background-color: #f1f1f1; }
    .features { margin: 20px 0; }
    .features li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://storage.googleapis.com/files-replit/platesync-logo.png" alt="PlateSync Logo" style="max-width: 250px; height: auto;">
      <h1>Welcome to PlateSync!</h1>
      <p>Your donation management system</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Hello {{USER_NAME}},</h2>
        <p>Welcome to PlateSync! We're excited to have you join {{CHURCH_NAME}} as a {{USER_ROLE}}.</p>
        <p>PlateSync is designed to make managing donations simple and efficient. Here's what you can do:</p>
        
        <ul class="features">
          <li><strong>Track Donations</strong> - Record and manage all donations in one place</li>
          <li><strong>Generate Reports</strong> - Create detailed reports for your finance team</li>
          <li><strong>Manage Members</strong> - Keep your member database up-to-date</li>
        </ul>
        
        <p>Your account has been created with the following details:</p>
        <p><strong>Email:</strong> {{USER_EMAIL}}</p>
        <p>Click the button below to set your password and access your account:</p>
        
        <div style="text-align: center;">
          <a href="{{LOGIN_URL}}" class="button">Set Password & Login</a>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>This email was sent to you via PlateSync.</p>
      <p>If you have any questions, please contact your account administrator.</p>
    </div>
  </div>
</body>
</html>`,
    lastUpdated: "May 10, 2025, 2:30 PM"
  },
  {
    id: "2",
    type: "PASSWORD_RESET",
    subject: "Reset Your PlateSync Password",
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your PlateSync Password</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px; }
    .header img { max-width: 150px; }
    .header h1 { color: #333; margin-top: 15px; margin-bottom: 5px; }
    .header p { color: #666; margin-top: 0; }
    .content { padding: 20px; background-color: #f8f8f8; }
    .section { background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .button { display: inline-block; background-color: #69ad4c; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 15px 0; }
    .button:hover { background-color: #5a9440; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; padding: 20px; background-color: #f1f1f1; }
    .expiry { font-size: 12px; color: #666; margin-top: 10px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://storage.googleapis.com/files-replit/platesync-logo.png" alt="PlateSync Logo" style="max-width: 250px; height: auto;">
      <h1>Password Reset Request</h1>
      <p>PlateSync Account Recovery</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Hello {{USER_NAME}},</h2>
        <p>We received a request to reset your password for your PlateSync account at {{CHURCH_NAME}}.</p>
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
          <a href="{{RESET_URL}}" class="button">Reset Password</a>
        </div>
        
        <p class="expiry">This link will expire in 24 hours.</p>
        
        <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>This email was sent to you via PlateSync.</p>
      <p>If you have any questions, please contact your account administrator.</p>
    </div>
  </div>
</body>
</html>`,
    lastUpdated: "May 12, 2025, 11:15 AM"
  }
];

export default function GlobalAdminSettings() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [currentView, setCurrentView] = useState<"list" | "edit">("list");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
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
        
        // We have a token, verify if it's valid by trying to decode it
        try {
          // Basic token validation (checking if it's properly formatted)
          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }
          
          // Check token expiration
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < currentTime) {
            throw new Error('Token has expired');
          }
          
          // Token seems valid, proceed with loading the page
          console.log("Global admin authenticated, loading settings page");
          setIsLoading(false);
        } catch (err) {
          console.error('Token validation error:', err);
          localStorage.removeItem("globalAdminToken");
          toast({
            title: "Session expired",
            description: "Please log in again to access the global admin portal",
            variant: "destructive",
          });
          setLocation("/global-admin/login");
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setLocation("/global-admin/login");
      }
    };
    
    checkAuth();
  }, [setLocation, toast]);
  
  // Handle editing a template
  const handleEditTemplate = (template: EmailTemplate) => {
    setActiveTemplate(template);
    setCurrentView("edit");
    setActiveTab("edit");
  };
  
  // Handle saving a template
  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;
    
    setIsSaving(true);
    
    try {
      // Get token for authentication
      const token = localStorage.getItem("globalAdminToken");
      if (!token) {
        throw new Error("Authentication required");
      }
      
      // Format data for the API - matching the server's expected field names exactly
      const templateData = {
        subject: activeTemplate.subject,
        bodyHtml: activeTemplate.body,
        bodyText: stripHtml(activeTemplate.body) // Simple function to strip HTML tags
      };
      
      // Make API call to update the template in the database
      const response = await fetch(`/api/email-templates/system/${activeTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to save template");
      }
      
      // Update the templates array with the edited template
      setTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === activeTemplate.id 
            ? { 
                ...activeTemplate, 
                lastUpdated: new Date().toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric', 
                  hour: 'numeric', 
                  minute: 'numeric',
                  hour12: true 
                }) 
              } 
            : t
        )
      );
      
      // Show success toast
      toast({
        title: "Template updated",
        description: "Email template has been successfully updated and saved to the database",
      });
      
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Failed to update template",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setCurrentView("list");
    }
  };
  
  // Helper function to strip HTML tags for plain text version
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };
  
  // Handle resetting a template to its default
  const handleResetTemplate = () => {
    if (!activeTemplate) return;
    
    // Find the original template
    const originalTemplate = initialTemplates.find(t => t.type === activeTemplate.type);
    
    if (originalTemplate) {
      setActiveTemplate(originalTemplate);
      toast({
        title: "Template reset",
        description: "Email template has been reset to its default content",
      });
    }
  };
  
  // Handle canceling the edit
  const handleCancelEdit = () => {
    setCurrentView("list");
    setActiveTemplate(null);
  };
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#69ad4c]" />
          <p className="text-gray-500">Verifying authentication...</p>
        </div>
      </div>
    );
  }

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
        
        {currentView === "list" ? (
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
                        className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {template.type === "WELCOME_EMAIL" ? "Welcome Email" : "Password Reset"}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                Last Edited: {template.lastUpdated || "Never"}
                              </p>
                            </div>
                            <span className="text-[#69ad4c] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center text-sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit Template
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Network className="h-5 w-5 mr-2 text-[#69ad4c]" />
                    <CardTitle>Third-Party Integrations</CardTitle>
                  </div>
                  <CardDescription>
                    Manage connections with external services used by PlateSync
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* SendGrid Integration */}
                    <div 
                      className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group"
                      onClick={() => setLocation("/global-admin/integrations/sendgrid")}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">SendGrid</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Email notification service used for sending emails from PlateSync
                            </p>
                          </div>
                          <span className="text-[#69ad4c] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center text-sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Manage
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Planning Center Integration */}
                    <div 
                      className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group"
                      onClick={() => setLocation("/global-admin/integrations/planning-center")}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Planning Center</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Connect with Planning Center to sync member data
                            </p>
                          </div>
                          <span className="text-[#69ad4c] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center text-sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Manage
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stripe Integration */}
                    <div 
                      className="border rounded-md overflow-hidden hover:border-[#69ad4c] hover:shadow-sm transition-all duration-200 cursor-pointer group"
                      onClick={() => setLocation("/global-admin/integrations/stripe")}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Stripe</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Payment processing for subscriptions and billing
                            </p>
                          </div>
                          <span className="text-[#69ad4c] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center text-sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Manage
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Edit template view
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-[#69ad4c]" />
                    {activeTemplate?.type === "WELCOME_EMAIL" 
                      ? "Welcome Email Template" 
                      : "Password Reset Template"
                    }
                  </CardTitle>
                  <CardDescription>
                    {activeTemplate?.type === "WELCOME_EMAIL"
                      ? "Sent to new users when their account is created"
                      : "Sent to users when they request a password reset"
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResetTemplate}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button 
                    onClick={handleSaveTemplate}
                    className="bg-[#69ad4c] hover:bg-[#5a9740]"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="edit" className="flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    Edit HTML
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={activeTemplate?.subject || ""}
                        onChange={(e) => setActiveTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bodyHtml">Email Body (HTML)</Label>
                      <Textarea
                        id="bodyHtml"
                        value={activeTemplate?.body || ""}
                        onChange={(e) => setActiveTemplate(prev => prev ? { ...prev, body: e.target.value } : null)}
                        className="mt-1 font-mono text-sm h-[400px]"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="border rounded-md p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Subject:</h3>
                      <p className="text-gray-800 text-base">{activeTemplate?.subject}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Email Preview:</h3>
                      <div className="border rounded-md overflow-hidden bg-white">
                        <EmailTemplatePreview 
                          subject={activeTemplate?.subject || ""} 
                          htmlContent={activeTemplate?.body || ""} 
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}