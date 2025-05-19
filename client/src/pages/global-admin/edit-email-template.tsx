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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Save, 
  Code, 
  Eye, 
  Loader2,
} from "lucide-react";

// Define template interface based on database schema
interface EmailTemplate {
  id: number;
  templateType: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  churchId: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditEmailTemplate() {
  const [_, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const templateId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [formData, setFormData] = useState<{
    subject: string;
    bodyHtml: string;
    bodyText: string;
  }>({
    subject: '',
    bodyHtml: '',
    bodyText: ''
  });
  
  // Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('globalAdminToken');
    if (!token) {
      setLocation('/global-admin/login');
    }
  }, [setLocation]);
  
  // Fetch template data from database
  const { 
    data: template, 
    isLoading, 
    isError,
    error
  } = useQuery<EmailTemplate>({
    queryKey: [`/api/email-templates/system/${templateId}`],
    queryFn: async () => {
      const response = await fetch(`/api/email-templates/system/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      return response.json();
    },
    enabled: !isNaN(templateId)
  });
  
  // Update form data when template is loaded
  useEffect(() => {
    if (template) {
      setFormData({
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText
      });
    }
  }, [template]);
  
  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/email-templates/system/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('globalAdminToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/email-templates/system/${templateId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates/system'] });
      
      toast({
        title: 'Template updated',
        description: 'The email template has been updated successfully.',
        variant: 'default',
        className: 'bg-white'
      });

      setLocation('/global-admin/system-templates');
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update template',
        variant: 'destructive',
        className: 'bg-white border-red-600'
      });
    }
  });
  
  // Handle form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };
  
  // Handle back button
  const handleBack = () => {
    setLocation('/global-admin/system-templates');
  };
  
  // Generate plain text from HTML when HTML is updated
  const updatePlainText = (htmlContent: string) => {
    // Create a temporary element to strip HTML tags
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    const plainText = temp.textContent || temp.innerText || '';
    
    setFormData(prev => ({
      ...prev,
      bodyText: plainText
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError || !template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">Error loading template: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button onClick={handleBack} variant="outline">Go Back</Button>
      </div>
    );
  }
  
  const formatTemplateType = (type: string): string => {
    switch(type) {
      case 'WELCOME_EMAIL':
        return 'Welcome Email';
      case 'PASSWORD_RESET':
        return 'Password Reset';
      default:
        return type.replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <GlobalAdminHeader />
      
      {/* Main content */}
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                  Edit {formatTemplateType(template.templateType)}
                </h1>
              </div>
            </div>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                          <div>
                            <Label htmlFor="subject" className="text-sm font-medium">
                              Subject
                            </Label>
                            <Input
                              id="subject"
                              name="subject"
                              value={formData.subject}
                              onChange={handleInputChange}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Available variables: {'{'}{'{USER_NAME}'}{'},'} {'{'}{'{CHURCH_NAME}'}{'},'} {'{'}{'{formattedUserRole}'}{'},'} etc.
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="bodyHtml" className="text-sm font-medium">
                              HTML Body
                            </Label>
                            <Textarea
                              id="bodyHtml"
                              name="bodyHtml"
                              value={formData.bodyHtml}
                              onChange={(e) => {
                                handleInputChange(e);
                                updatePlainText(e.target.value);
                              }}
                              className="mt-1 font-mono"
                              rows={15}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              HTML version of the email. Use variables like {'{'}'{'{'}USER_NAME{'}'}'{'}'}, {'{'}'{'{'}CHURCH_NAME{'}'}'{'}'}, {'{'}'{'{'}formattedUserRole{'}'}'{'}'}, etc.
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="bodyText" className="text-sm font-medium">
                              Plain Text Body (Auto-generated)
                            </Label>
                            <Textarea
                              id="bodyText"
                              name="bodyText"
                              value={formData.bodyText}
                              onChange={handleInputChange}
                              className="mt-1 font-mono bg-gray-50"
                              rows={5}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Plain text version of the email for clients that don't support HTML. This is auto-generated from the HTML version.
                            </p>
                          </div>
                          
                          <div className="flex justify-end space-x-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleBack}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-primary hover:bg-primary/90 text-white"
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="preview">
                        <div className="border rounded-lg p-4 bg-white">
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-medium text-gray-500">Subject:</p>
                            <p className="font-medium">{formData.subject}</p>
                          </div>
                          
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: formData.bodyHtml }} />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}