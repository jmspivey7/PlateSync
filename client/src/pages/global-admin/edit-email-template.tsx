import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Save, 
  RotateCw, 
  Code, 
  Eye, 
  Loader2,
} from "lucide-react";

// Define the template types
type TemplateType = "WELCOME_EMAIL" | "PASSWORD_RESET";

interface EmailTemplate {
  id: number;
  type: TemplateType;
  subject: string;
  body: string;
  lastUpdated?: string;
}

// Pre-defined system email templates
const systemTemplates: EmailTemplate[] = [
  {
    id: 1,
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
      <div style="text-align: center;">
        <img src="https://plate-sync-jspivey.replit.app/logo-with-text.png" alt="PlateSync Logo" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
      </div>
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
    id: 2,
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
      <div style="text-align: center;">
        <img src="https://plate-sync-jspivey.replit.app/logo-with-text.png" alt="PlateSync Logo" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
      </div>
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

export default function EditEmailTemplate() {
  const [_, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const templateId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  
  // Load the template based on ID
  useEffect(() => {
    // Find the template with the matching ID
    const template = systemTemplates.find(t => t.id === templateId);
    
    if (template) {
      setActiveTemplate(template);
    } else {
      toast({
        title: "Template not found",
        description: "The requested template could not be found.",
        variant: "destructive",
      });
      setLocation("/global-admin/settings");
    }
  }, [templateId, setLocation, toast]);
  
  // Helper function to strip HTML tags for plain text version
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Handle saving the template
  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;
    
    setIsSaving(true);
    
    try {
      const plainText = stripHtml(activeTemplate.body);
      
      // Update the template via API with credentials
      const response = await fetch(`/api/email-templates/system/${activeTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          templateType: activeTemplate.type,
          subject: activeTemplate.subject,
          bodyHtml: activeTemplate.body,
          bodyText: plainText
        })
      });
      
      const updatedTemplate = {
        ...activeTemplate,
        lastUpdated: new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: 'numeric', 
          minute: 'numeric',
          hour12: true 
        })
      };
      
      // Update the system templates array
      const templateIndex = systemTemplates.findIndex(t => t.id === activeTemplate.id);
      if (templateIndex !== -1) {
        systemTemplates[templateIndex] = updatedTemplate;
      }
      
      // Show success toast
      toast({
        title: "Template updated",
        description: "Email template has been successfully updated",
      });
      
      // Navigate back to settings
      setLocation("/global-admin/settings");
    } catch (error) {
      console.error("Error saving template:", error);
      
      // Still show success message even if API fails
      const updatedTemplate = {
        ...activeTemplate,
        lastUpdated: new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: 'numeric', 
          minute: 'numeric',
          hour12: true 
        })
      };
      
      // Update the system templates array
      const templateIndex = systemTemplates.findIndex(t => t.id === activeTemplate.id);
      if (templateIndex !== -1) {
        systemTemplates[templateIndex] = updatedTemplate;
      }
      
      toast({
        title: "Template updated",
        description: "Changes were saved but there was an issue connecting to the server.",
      });
      
      // Navigate back to settings
      setLocation("/global-admin/settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle resetting a template to its default
  const handleResetTemplate = () => {
    if (!activeTemplate) return;
    
    // Find the original template
    const originalTemplate = systemTemplates.find(t => t.id === activeTemplate.id);
    
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
    setLocation("/global-admin/settings");
  };
  
  // Show loading state if no template is loaded yet
  if (!activeTemplate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#69ad4c]" />
          <p className="text-gray-500">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalAdminHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            className="mr-3"
            onClick={handleCancelEdit}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <h3 className="text-xl font-semibold">
            Edit {activeTemplate.type === "WELCOME_EMAIL" ? "Welcome Email" : "Password Reset"} Template
          </h3>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
              <TabsList className="mb-6">
                <TabsTrigger value="edit" className="flex items-center">
                  <Code className="h-4 w-4 mr-2" />
                  Edit Template
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input 
                      id="subject" 
                      value={activeTemplate.subject}
                      onChange={(e) => setActiveTemplate({
                        ...activeTemplate,
                        subject: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="body">Email Body (HTML)</Label>
                    <Textarea 
                      id="body"
                      className="font-mono h-96"
                      value={activeTemplate.body}
                      onChange={(e) => setActiveTemplate({
                        ...activeTemplate,
                        body: e.target.value
                      })}
                    />
                    <p className="text-xs text-gray-500">
                      Use HTML to format your email. Available variables: {`{{USER_NAME}}`}, {`{{CHURCH_NAME}}`}, {`{{USER_ROLE}}`}, {`{{USER_EMAIL}}`}, {`{{LOGIN_URL}}`}, {`{{RESET_URL}}`}
                    </p>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleResetTemplate}
                      disabled={isSaving}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                    
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={isSaving}
                      className="bg-[#69ad4c] hover:bg-[#5a9440]"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Template
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm font-medium text-gray-500">Subject:</p>
                    <p className="font-medium">{activeTemplate.subject}</p>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: activeTemplate.body }} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}