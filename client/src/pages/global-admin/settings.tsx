import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useGlobalAdminAuth } from "@/hooks/useGlobalAdminAuth";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import EmailTemplatePreview from "@/components/global-admin/EmailTemplatePreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings as SettingsIcon, Save, Mail, RotateCw, Code, Eye, Loader2 } from "lucide-react";

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
    h2 { color: #69ad4c; margin-top: 0; }
    a { color: #69ad4c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header" style="text-align: center; padding: 20px;">
      <h1>Welcome to PlateSync!</h1>
      <p>Your church donation management solution</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Hello {{userName}},</h2>
        
        <p>Welcome to PlateSync! Your account for <strong>{{churchName}}</strong> has been successfully created.</p>
        
        <p>PlateSync is a comprehensive donation management system designed to help churches like yours streamline the process of tracking and managing donations.</p>
        
        <div style="text-align: center;">
          <a href="{{loginUrl}}" class="button">Log In to PlateSync</a>
        </div>
      </div>
      
      <div class="section">
        <h2>What You Can Do With PlateSync</h2>
        <ul class="features">
          <li><strong>Record Donations:</strong> Easily track all your church donations in one place</li>
          <li><strong>Manage Members:</strong> Keep your member database updated and organized</li>
          <li><strong>Process Batches:</strong> Handle donation batches efficiently with our batch processing system</li>
          <li><strong>Generate Reports:</strong> Create comprehensive reports for your church leadership</li>
          <li><strong>Email Notifications:</strong> Automatically send donation receipts and other notifications</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>Need Help?</h2>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Thank you for choosing PlateSync!</p>
        <p>Best regards,<br>The PlateSync Team</p>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 PlateSync. All rights reserved.</p>
      <p>This email was sent to {{userEmail}} because you registered for a PlateSync account.</p>
    </div>
  </div>
</body>
</html>
`,
    lastUpdated: "May 10, 2025"
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
    .resetUrl { word-break: break-all; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 3px; font-family: monospace; font-size: 14px; margin: 15px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; padding: 20px; background-color: #f1f1f1; }
    h2 { color: #69ad4c; margin-top: 0; }
    a { color: #69ad4c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header" style="text-align: center; padding: 20px;">
      <h1>Password Reset Request</h1>
      <p>Follow the instructions below to reset your password</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Hello {{userName}},</h2>
        
        <p>We received a request to reset your password for your PlateSync account at <strong>{{churchName}}</strong>.</p>
        
        <p>To reset your password, please click the button below:</p>
        
        <div style="text-align: center;">
          <a href="{{resetUrl}}" class="button">Reset Password</a>
        </div>
        
        <p>If the button above doesn't work, you can copy and paste the following URL into your browser:</p>
        <div class="resetUrl">{{resetUrl}}</div>
        
        <p><strong>Important:</strong> This password reset link will expire in 24 hours.</p>
        
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns about your account security.</p>
      </div>
      
      <div class="section">
        <h2>Need Help?</h2>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Thank you for using PlateSync!</p>
        <p>Best regards,<br>The PlateSync Team</p>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 PlateSync. All rights reserved.</p>
      <p>This email was sent to {{userEmail}} in response to a password reset request.</p>
    </div>
  </div>
</body>
</html>
`,
    lastUpdated: "May 12, 2025"
  }
];

export default function GlobalAdminSettings() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useGlobalAdminAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [currentView, setCurrentView] = useState<"list" | "edit">("list");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if the global admin is authenticated
  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the global admin portal",
        variant: "destructive",
      });
      setLocation("/global-admin/login");
      return;
    }
    
    // If authenticated, continue loading the page
    console.log("Global admin authenticated, loading settings page");
  }, [isLoading, isAuthenticated, toast, setLocation]);
  
  // Handle template edit
  const handleEditTemplate = (template: EmailTemplate) => {
    setActiveTemplate({...template});
    setCurrentView("edit");
  };
  
  // Handle template reset
  const handleResetTemplate = () => {
    if (!activeTemplate) return;
    
    const originalTemplate = initialTemplates.find(t => t.type === activeTemplate.type);
    if (originalTemplate) {
      setActiveTemplate({...originalTemplate});
      
      toast({
        title: "Template reset",
        description: "Template has been reset to its original version.",
      });
    }
  };
  
  // Handle template save
  const handleSaveTemplate = () => {
    if (!activeTemplate) return;
    
    setIsSaving(true);
    
    // Simulate API call with a short delay
    setTimeout(() => {
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.id === activeTemplate.id 
            ? {...activeTemplate, lastUpdated: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} 
            : template
        )
      );
      
      setCurrentView("list");
      setIsSaving(false);
      
      toast({
        title: "Template updated",
        description: `${activeTemplate.type === 'WELCOME_EMAIL' ? 'Welcome Email' : 'Password Reset'} template has been updated successfully.`,
      });
    }, 800);
  };
  
  // Handle cancel edit
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
  
  // If not authenticated, don't render anything (redirect happens in useEffect)
  if (!isAuthenticated) {
    return null;
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
                  <div key={template.id} className="border rounded-md overflow-hidden">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">
                          {template.type === "WELCOME_EMAIL" ? "Welcome Email" : "Password Reset"}
                        </h3>
                        <Button 
                          onClick={() => handleEditTemplate(template)}
                          className="bg-[#69ad4c] hover:bg-[#5a9740]"
                        >
                          Edit Template
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Last Edited: {template.lastUpdated || "Never"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
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
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as "edit" | "preview")}
              >
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
                
                <TabsContent value="edit" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input 
                      id="subject" 
                      value={activeTemplate?.subject || ""} 
                      onChange={(e) => activeTemplate && setActiveTemplate({
                        ...activeTemplate, 
                        subject: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="body">Email Body (HTML)</Label>
                    <Textarea 
                      id="body" 
                      value={activeTemplate?.body || ""} 
                      onChange={(e) => activeTemplate && setActiveTemplate({
                        ...activeTemplate, 
                        body: e.target.value
                      })}
                      className="font-mono text-sm h-[400px]"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Subject Preview</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        {activeTemplate?.subject}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">HTML Preview</h4>
                      <div className="bg-white border rounded-md overflow-hidden">
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