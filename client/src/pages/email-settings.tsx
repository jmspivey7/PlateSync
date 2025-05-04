import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/layout/PageLayout";

interface EmailSettings {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  templateSubject: string;
  templateBody: string;
}

const defaultEmailSettings: EmailSettings = {
  enabled: false,
  fromEmail: "",
  fromName: "PlateSync",
  templateSubject: "Thank you for your donation",
  templateBody: "Dear {{donorName}},\n\nThank you for your donation of ${{amount}} on {{date}}.\n\nSincerely,\n{{churchName}}"
};

const EmailSettings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Fetch email settings
  const { data: settings, isLoading } = useQuery<EmailSettings>({
    queryKey: ['/api/email-settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/email-settings');
        return response;
      } catch (error) {
        // Return default settings if no settings are found
        return defaultEmailSettings;
      }
    },
  });
  
  const [formData, setFormData] = useState<EmailSettings>(defaultEmailSettings);
  
  // Update form data when settings are loaded
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  });
  
  // Update email settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      return await apiRequest('/api/email-settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Email settings updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-settings'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update email settings',
        variant: 'destructive',
      });
    },
  });
  
  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('/api/email-settings/test', {
        method: 'POST',
        body: JSON.stringify({ email, ...formData }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Test email sent successfully',
      });
      setShowTestEmailDialog(false);
      setTestEmailAddress("");
      setIsSendingTest(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive',
      });
      setIsSendingTest(false);
    },
  });
  
  // Handle form changes
  const handleChange = (field: keyof EmailSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };
  
  // Handle sending test email
  const handleSendTestEmail = () => {
    if (!testEmailAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSendingTest(true);
    sendTestEmailMutation.mutate(testEmailAddress);
  };
  
  // If not admin, redirect or show error
  if (!isAdmin) {
    return (
      <PageLayout title="Access Denied" subtitle="You do not have permission to access this page">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">You need administrator privileges to view this page.</p>
            <Button onClick={() => window.location.href = "/dashboard"}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Email Settings" subtitle="Configure donor notification emails">
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>
                  Configure how and when donors receive email notifications for their donations
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="email-enabled" className="flex flex-col space-y-1">
                    <span>Enable Email Notifications</span>
                    <span className="font-normal text-sm text-gray-500">
                      When enabled, donors will receive email notifications for their donations
                    </span>
                  </Label>
                  <Switch
                    id="email-enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => handleChange('enabled', checked)}
                  />
                </div>
                
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-medium">Email Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fromName">From Name</Label>
                      <Input
                        id="fromName"
                        placeholder="Church Name"
                        value={formData.fromName}
                        onChange={(e) => handleChange('fromName', e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        The name that will appear as the sender of the email
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input
                        id="fromEmail"
                        type="email"
                        placeholder="donations@yourchurch.org"
                        value={formData.fromEmail}
                        onChange={(e) => handleChange('fromEmail', e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        The email address that will appear as the sender
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="templateSubject">Email Subject Template</Label>
                    <Input
                      id="templateSubject"
                      placeholder="Thank you for your donation"
                      value={formData.templateSubject}
                      onChange={(e) => handleChange('templateSubject', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      The subject line for donation notification emails
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="templateBody">Email Body Template</Label>
                    <Textarea
                      id="templateBody"
                      rows={8}
                      value={formData.templateBody}
                      onChange={(e) => handleChange('templateBody', e.target.value)}
                      className="resize-y"
                    />
                    <p className="text-xs text-gray-500">
                      You can use the following variables in your template: <br />
                      <code>{{donorName}}</code>, <code>{{amount}}</code>, <code>{{date}}</code>, <code>{{churchName}}</code>
                    </p>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <AlertDialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Test Email
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send Test Email</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter an email address to send a test notification email.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="test-email" className="mb-2 block">
                        Email Address
                      </Label>
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="test@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSendTestEmail}
                        className="bg-[#69ad4c] hover:bg-[#588f3f]"
                        disabled={isSendingTest}
                      >
                        {isSendingTest ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Test Email"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button 
                  type="submit" 
                  className="bg-[#69ad4c] hover:bg-[#588f3f]"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </div>
    </PageLayout>
  );
};

export default EmailSettings;