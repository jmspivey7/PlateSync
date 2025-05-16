import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GlobalAdminAccountDropdown from '@/components/global-admin/GlobalAdminAccountDropdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function EditSystemTemplate() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const templateId = parseInt(id);
  
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
  
  // Fetch template data
  const { 
    data: template, 
    isLoading, 
    isError 
  } = useQuery<EmailTemplate>({
    queryKey: [`/api/email-templates/system/${templateId}`],
    queryFn: async () => {
      const response = await fetch(`/api/email-templates/system/${templateId}`);
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
          'Content-Type': 'application/json'
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
        <p className="text-red-500 mb-4">Error loading template</p>
        <Button onClick={handleBack} variant="outline">Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-semibold text-primary">PlateSync <span className="text-gray-500 text-sm">Admin</span></span>
              </div>
            </div>
            <div className="flex items-center">
              <GlobalAdminAccountDropdown />
            </div>
          </div>
        </div>
      </div>
      
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
                <Mail className="h-8 w-8 text-primary mr-3" />
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
                        You can use variables like {{churchName}}, {{userName}}, etc.
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
                        onChange={handleInputChange}
                        className="mt-1 font-mono"
                        rows={10}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        HTML version of the email. You can use basic HTML tags.
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="bodyText" className="text-sm font-medium">
                        Plain Text Body
                      </Label>
                      <Textarea
                        id="bodyText"
                        name="bodyText"
                        value={formData.bodyText}
                        onChange={handleInputChange}
                        className="mt-1 font-mono"
                        rows={10}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Plain text version of the email for clients that don't support HTML.
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