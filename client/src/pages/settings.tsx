import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2, Loader2, Mail, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ToastNotification from "@/components/ui/toast-notification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PageLayout from "@/components/layout/PageLayout";
import CsvImporter from "@/components/settings/CsvImporter";

// Create a schema for settings form
const formSchema = z.object({
  churchName: z.string().min(1, "Church name is required"),
});

type FormValues = z.infer<typeof formSchema>;

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [sendgridTestStatus, setSendgridTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sendgridTestMessage, setSendgridTestMessage] = useState<string | null>(null);
  
  // React Hook Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: user?.churchName || "",
    },
  });
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("PATCH", "/api/settings", values);
      
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      setShowSuccessToast(true);
      
      toast({
        title: "Settings updated",
        description: "Your church settings have been saved successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    updateSettingsMutation.mutate(values);
  };
  
  // Test SendGrid configuration
  const testSendGridConfiguration = async () => {
    setSendgridTestStatus('loading');
    setSendgridTestMessage(null);
    
    try {
      const response = await apiRequest('GET', '/api/test-sendgrid');
      const data = await response.json();
      
      if (response.ok) {
        setSendgridTestStatus('success');
        setSendgridTestMessage(data.message);
      } else {
        setSendgridTestStatus('error');
        setSendgridTestMessage(data.message || 'Failed to test SendGrid configuration');
      }
    } catch (error) {
      setSendgridTestStatus('error');
      setSendgridTestMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };
  
  return (
    <PageLayout title="Settings" subtitle="Manage your church and notification settings">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Church Information</CardTitle>
            <CardDescription>
              Update your church's information displayed throughout the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="churchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Church Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="First Baptist Church" />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on receipts and throughout the application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-[#48BB78] hover:bg-[#48BB78]/90 text-white"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure how PlateSync sends email notifications to donors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-4">
              <p>Email notifications are sent via SendGrid when donations are recorded.</p>
              <p className="mt-2">Notification emails include:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Donation amount</li>
                <li>Donation date</li>
                <li>Donor information</li>
                <li>Your church name</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm mb-4">
              <p className="font-medium">Note about notifications</p>
              <p className="mt-1">
                Make sure your SendGrid API key is properly configured in the environment 
                variables for email notifications to work correctly.
              </p>
            </div>
            
            {sendgridTestStatus === 'success' && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">SendGrid is configured correctly</AlertTitle>
                <AlertDescription className="text-green-700 text-sm">
                  {sendgridTestMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {sendgridTestStatus === 'error' && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">SendGrid configuration issue</AlertTitle>
                <AlertDescription className="text-red-700 text-sm">
                  {sendgridTestMessage || 'There was a problem testing your SendGrid configuration.'}
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={testSendGridConfiguration}
              disabled={sendgridTestStatus === 'loading'}
              variant="outline"
              className="w-full"
            >
              {sendgridTestStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing SendGrid Configuration...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Test SendGrid Configuration
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Import Members</CardTitle>
            <CardDescription>
              Import member data from CSV files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImporter />
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
            <CardDescription>
              Export donation and member data for reporting purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="outline" className="text-[#2D3748]">
                Monthly Donation Report
              </Button>
              <Button variant="outline" className="text-[#2D3748]">
                Annual Giving Statement
              </Button>
              <Button variant="outline" className="text-[#2D3748]">
                Member Directory
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              * Reports will be generated in CSV format for easy import into spreadsheet software.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {showSuccessToast && (
        <ToastNotification
          title="Settings Saved"
          message="Your church settings have been updated successfully."
          variant="success"
          duration={3000}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </PageLayout>
  );
};

export default Settings;
