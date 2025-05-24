import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import GlobalAdminHeader from '@/components/global-admin/GlobalAdminHeader';
import { apiRequest } from '@/lib/queryClient';

const awsS3Schema = z.object({
  accessKeyId: z.string().min(1, 'Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret Access Key is required'),
  region: z.string().min(1, 'Region is required'),
  bucketName: z.string().min(1, 'Bucket Name is required'),
});

type AwsS3FormData = z.infer<typeof awsS3Schema>;

interface AwsS3Settings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export default function AwsS3Integration() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const form = useForm<AwsS3FormData>({
    resolver: zodResolver(awsS3Schema),
    defaultValues: {
      accessKeyId: '',
      secretAccessKey: '',
      region: '',
      bucketName: '',
    },
  });

  // Load current AWS S3 settings using the same pattern as other integrations
  const { data: settings, isLoading } = useQuery<AwsS3Settings>({
    queryKey: ['/api/global-admin/integrations/aws-s3'],
    queryFn: async () => {
      const token = localStorage.getItem("globalAdminToken");
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/api/global-admin/integrations/aws-s3', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch AWS S3 settings');
      return response.json();
    },
    retry: false,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        accessKeyId: settings.accessKeyId || '',
        secretAccessKey: settings.secretAccessKey || '',
        region: settings.region || '',
        bucketName: settings.bucketName || '',
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: AwsS3FormData) => {
      const response = await fetch('/api/global-admin/integrations/aws-s3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings saved',
        description: 'AWS S3 configuration has been updated successfully.',
      });
      setTestResult(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save AWS S3 settings',
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: AwsS3FormData) => {
      const token = localStorage.getItem("globalAdminToken");
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/api/global-admin/integrations/aws-s3/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setTestResult('success');
        toast({
          title: 'Connection successful',
          description: 'AWS S3 connectivity test passed!',
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Connection failed',
          description: result.error || 'AWS S3 connectivity test failed',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setTestResult('error');
      toast({
        title: 'Test failed',
        description: error.message || 'Failed to test AWS S3 connection',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AwsS3FormData) => {
    saveMutation.mutate(data);
  };

  const onTest = () => {
    const formData = form.getValues();
    
    // Validate form before testing
    const result = awsS3Schema.safeParse(formData);
    if (!result.success) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields before testing',
        variant: 'destructive',
      });
      return;
    }
    
    testMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalAdminHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading AWS S3 settings...</p>
          </div>
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
            <div className="h-7 w-7 bg-[#69ad4c] rounded mr-3 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S3</span>
            </div>
            <h2 className="text-2xl font-bold">AWS S3 Integration</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/settings?tab=integrations")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>

        <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Configure Remote Storage</CardTitle>
                  <CardDescription>
                    Set up AWS S3 for storing church logos, images, and other files securely in the cloud.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="accessKeyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AWS Access Key ID</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="AKIA..."
                                type="password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secretAccessKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AWS Secret Access Key</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Enter your secret access key"
                                type="password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AWS Region</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="us-east-1"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bucketName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>S3 Bucket Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="my-platesync-bucket"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {testResult && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                          testResult === 'success' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {testResult === 'success' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                          <span className="font-medium">
                            {testResult === 'success' 
                              ? 'Connection successful!' 
                              : 'Connection failed'
                            }
                          </span>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onTest}
                          disabled={testMutation.isPending}
                          className="flex-1"
                        >
                          {testMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          Test Connectivity
                        </Button>

                        <Button
                          type="submit"
                          disabled={saveMutation.isPending}
                          className="flex-1 bg-[#69ad4c] hover:bg-[#5a9440] text-white"
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Configuration
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
      </main>
    </div>
  );
}