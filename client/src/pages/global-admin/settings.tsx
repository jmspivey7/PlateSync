import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
  Check
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

// Sample template data
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 200px; }
    .button { display: inline-block; background-color: #69ad4c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" class="logo">
      <h1>Welcome to PlateSync!</h1>
    </div>
    
    <p>Hello {{userName}},</p>
    
    <p>Welcome to PlateSync! Your account for <strong>{{churchName}}</strong> has been successfully created.</p>
    
    <p>PlateSync is a comprehensive donation management system designed to help churches like yours streamline the process of tracking and managing donations.</p>
    
    <p>To get started, please click the button below to log in:</p>
    
    <p style="text-align: center;">
      <a href="{{loginUrl}}" class="button">Log In to PlateSync</a>
    </p>
    
    <p>Here are a few things you can do with PlateSync:</p>
    <ul>
      <li>Record and track donations</li>
      <li>Manage member information</li>
      <li>Process donation batches</li>
      <li>Generate reports</li>
    </ul>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    
    <p>Thank you for choosing PlateSync!</p>
    
    <p>Best regards,<br>
    The PlateSync Team</p>
    
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 200px; }
    .button { display: inline-block; background-color: #69ad4c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .code { font-family: monospace; font-size: 24px; letter-spacing: 0.5em; text-align: center; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" class="logo">
      <h1>Password Reset Request</h1>
    </div>
    
    <p>Hello {{userName}},</p>
    
    <p>We received a request to reset your password for your PlateSync account at <strong>{{churchName}}</strong>.</p>
    
    <p>To reset your password, please click the button below:</p>
    
    <p style="text-align: center;">
      <a href="{{resetUrl}}" class="button">Reset Password</a>
    </p>
    
    <p>Alternatively, you can copy and paste the following URL into your browser:</p>
    <p style="word-break: break-all;">{{resetUrl}}</p>
    
    <p>This password reset link will expire in 24 hours. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    
    <p>Thank you for using PlateSync!</p>
    
    <p>Best regards,<br>
    The PlateSync Team</p>
    
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
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the global admin portal",
        variant: "destructive",
      });
      setLocation("/global-admin/login");
    }
  }, [toast, setLocation]);
  
  // Function to handle template selection
  const handleSelectTemplate = (type: TemplateType) => {
    const template = templates.find(t => t.type === type);
    if (template) {
      setCurrentTemplate({...template});
      setIsEditing(false);
    }
  };
  
  // Function to handle template edit
  const handleEditTemplate = () => {
    setIsEditing(true);
  };
  
  // Function to handle template save
  const handleSaveTemplate = () => {
    if (!currentTemplate) return;
    
    setIsSaving(true);
    
    // Simulate API call with a short delay
    setTimeout(() => {
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.id === currentTemplate.id 
            ? {...currentTemplate, lastUpdated: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} 
            : template
        )
      );
      
      setIsEditing(false);
      setIsSaving(false);
      
      toast({
        title: "Template updated",
        description: `${currentTemplate.type === 'WELCOME_EMAIL' ? 'Welcome Email' : 'Password Reset'} template has been updated successfully.`,
      });
    }, 800);
  };
  
  // Function to handle template reset
  const handleResetTemplate = () => {
    if (!currentTemplate) return;
    
    const originalTemplate = initialTemplates.find(t => t.type === currentTemplate.type);
    if (originalTemplate) {
      setCurrentTemplate({...originalTemplate});
      
      toast({
        title: "Template reset",
        description: "Template has been reset to its original version.",
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <GlobalAdminHeader />
      
      {/* Main content */}
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
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-[#69ad4c]" />
              System Email Templates
            </CardTitle>
            <CardDescription>
              Configure the email templates used system-wide for all churches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="welcome" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger 
                  value="welcome" 
                  onClick={() => handleSelectTemplate("WELCOME_EMAIL")}
                >
                  Welcome Email
                </TabsTrigger>
                <TabsTrigger 
                  value="password" 
                  onClick={() => handleSelectTemplate("PASSWORD_RESET")}
                >
                  Password Reset
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="welcome">
                {currentTemplate && currentTemplate.type === "WELCOME_EMAIL" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Welcome Email Template</h3>
                        <p className="text-sm text-muted-foreground">
                          Sent to new users when their account is created
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!isEditing ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleResetTemplate}
                            >
                              <RotateCw className="h-4 w-4 mr-2" />
                              Reset
                            </Button>
                            <Button 
                              onClick={handleEditTemplate}
                              className="bg-[#69ad4c] hover:bg-[#5a9740]"
                              size="sm"
                            >
                              Edit Template
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                handleSelectTemplate("WELCOME_EMAIL");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSaveTemplate}
                              className="bg-[#69ad4c] hover:bg-[#5a9740]"
                              size="sm"
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
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="welcome-subject">Email Subject</Label>
                        <Input 
                          id="welcome-subject" 
                          value={currentTemplate.subject}
                          onChange={(e) => setCurrentTemplate({
                            ...currentTemplate,
                            subject: e.target.value
                          })}
                          disabled={!isEditing}
                          className="font-mono"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="welcome-body">Email Body (HTML)</Label>
                        <Textarea 
                          id="welcome-body" 
                          value={currentTemplate.body}
                          onChange={(e) => setCurrentTemplate({
                            ...currentTemplate,
                            body: e.target.value
                          })}
                          disabled={!isEditing}
                          className="min-h-[500px] font-mono text-sm"
                        />
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Last updated: {currentTemplate.lastUpdated || "Never"}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md border">
                        <h4 className="text-sm font-medium mb-2">Available Template Variables:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li><code>{"{{userName}}"}</code> - The user's name</li>
                          <li><code>{"{{userEmail}}"}</code> - The user's email address</li>
                          <li><code>{"{{churchName}}"}</code> - The church name</li>
                          <li><code>{"{{churchLogoUrl}}"}</code> - URL to the church's logo</li>
                          <li><code>{"{{loginUrl}}"}</code> - URL for the user to log in</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="password">
                {currentTemplate && currentTemplate.type === "PASSWORD_RESET" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Password Reset Email Template</h3>
                        <p className="text-sm text-muted-foreground">
                          Sent to users when they request a password reset
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!isEditing ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleResetTemplate}
                            >
                              <RotateCw className="h-4 w-4 mr-2" />
                              Reset
                            </Button>
                            <Button 
                              onClick={handleEditTemplate}
                              className="bg-[#69ad4c] hover:bg-[#5a9740]"
                              size="sm"
                            >
                              Edit Template
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                handleSelectTemplate("PASSWORD_RESET");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSaveTemplate}
                              className="bg-[#69ad4c] hover:bg-[#5a9740]"
                              size="sm"
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
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reset-subject">Email Subject</Label>
                        <Input 
                          id="reset-subject" 
                          value={currentTemplate.subject}
                          onChange={(e) => setCurrentTemplate({
                            ...currentTemplate,
                            subject: e.target.value
                          })}
                          disabled={!isEditing}
                          className="font-mono"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="reset-body">Email Body (HTML)</Label>
                        <Textarea 
                          id="reset-body" 
                          value={currentTemplate.body}
                          onChange={(e) => setCurrentTemplate({
                            ...currentTemplate,
                            body: e.target.value
                          })}
                          disabled={!isEditing}
                          className="min-h-[500px] font-mono text-sm"
                        />
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Last updated: {currentTemplate.lastUpdated || "Never"}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md border">
                        <h4 className="text-sm font-medium mb-2">Available Template Variables:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li><code>{"{{userName}}"}</code> - The user's name</li>
                          <li><code>{"{{userEmail}}"}</code> - The user's email address</li>
                          <li><code>{"{{churchName}}"}</code> - The church name</li>
                          <li><code>{"{{churchLogoUrl}}"}</code> - URL to the church's logo</li>
                          <li><code>{"{{resetUrl}}"}</code> - URL for the password reset link</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}