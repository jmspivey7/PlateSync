import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Edit } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Define the Global Admin template types
type GlobalAdminTemplateType = 'WELCOME_EMAIL' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';

interface EmailTemplate {
  id: number;
  templateType: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  churchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SystemEmailTemplates() {
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  // Fetch all templates
  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['/api/email-templates/system', 'v4'], // Updated version to force cache refresh
    queryFn: async () => {
      const response = await fetch('/api/email-templates/system?_=' + Date.now()); // Cache buster
      if (!response.ok) {
        throw new Error('Failed to fetch system email templates');
      }
      const data = await response.json();
      console.log('🔍 Frontend received templates:', data.map((t: any) => `ID ${t.id}: ${t.templateType}`));
      console.log('🔍 Full template data:', data);
      return data;
    },
    staleTime: 0, // Always refetch
    cacheTime: 0  // Don't cache
  });

  // Initialize templates if none exist
  const initializeTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/email-templates/initialize-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize system email templates');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "System templates initialized",
        description: "Default system email templates have been created successfully.",
        variant: "default",
        className: "bg-white"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates/system'] });
      setInitialized(true);
    },
    onError: (error) => {
      toast({
        title: "Initialization failed",
        description: error instanceof Error ? error.message : "Failed to initialize templates",
        variant: "destructive",
        className: "bg-white border-red-600"
      });
    },
  });

  // Initialize templates on component mount
  useEffect(() => {
    // Define system templates that we need
    const systemTemplateTypes: GlobalAdminTemplateType[] = ['WELCOME_EMAIL', 'PASSWORD_RESET', 'EMAIL_VERIFICATION'];
    const existingTemplateTypes = templates.map((t: EmailTemplate) => t.templateType);
    const hasRequiredTemplates = systemTemplateTypes.every(type => 
      existingTemplateTypes.includes(type)
    );
    
    if (!hasRequiredTemplates && !isLoading && !isError && !initialized) {
      initializeTemplatesMutation.mutate();
    }
  }, [templates.length, isLoading, isError, initialized]);

  // Check if template has been customized by comparing createdAt and updatedAt
  const isTemplateCustomized = (template: EmailTemplate): boolean => {
    return new Date(template.updatedAt).getTime() > new Date(template.createdAt).getTime();
  };

  // Format the last edited date
  const formatLastEdited = (template: EmailTemplate): string => {
    const date = isTemplateCustomized(template) 
      ? new Date(template.updatedAt) 
      : new Date(template.createdAt);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Handle edit template
  const handleEditTemplate = (template: EmailTemplate) => {
    console.log('Clicking template:', template.id, template.templateType);
    setLocation(`/global-admin/edit-email-template/${template.id}`);
  };

  // Format template type for display
  const formatTemplateType = (type: string): string => {
    switch(type) {
      case 'WELCOME_EMAIL':
        return 'Welcome Email';
      case 'PASSWORD_RESET':
        return 'Password Reset';
      default:
        return type.replace(/_/g, ' ').toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-4 text-red-500">
        Error loading templates. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">System Email Templates</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage system-wide email templates that are used across all churches.
        </p>
        
        <div className="border border-gray-400 rounded-md overflow-hidden mt-4">
          <div className="divide-y">
            {Array.isArray(templates) && templates.length > 0 ? [...templates]
              // Filter to only show global admin templates (WELCOME_EMAIL, PASSWORD_RESET, and EMAIL_VERIFICATION)
              .filter(template => 
                (template.templateType === 'WELCOME_EMAIL' || 
                template.templateType === 'PASSWORD_RESET' ||
                template.templateType === 'EMAIL_VERIFICATION') as boolean
              )
              .sort((a, b) => {
                // Define the order of Global Admin template types
                const templateOrder: Record<string, number> = {
                  'WELCOME_EMAIL': 1,
                  'PASSWORD_RESET': 2,
                  'EMAIL_VERIFICATION': 3
                };
                
                // Sort based on the defined order (with fallback if template type not found)
                return (templateOrder[a.templateType] || 99) - (templateOrder[b.templateType] || 99);
              })
              .map((template) => (
              <div 
                key={template.id}
                onClick={() => handleEditTemplate(template)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        {formatTemplateType(template.templateType)}
                      </h3>
                      <div className="text-xs text-gray-500 mt-1">
                        {isTemplateCustomized(template) ? 
                          <span className="text-green-600">Customized</span> : 
                          <span className="text-gray-500">Default</span>
                        }
                        <span className="mx-1">•</span>
                        <span>Last edited: {formatLastEdited(template)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <Edit className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-gray-500">
                No system email templates found. Click initialize to create default templates.
              </div>
            )}
          </div>
        </div>
        
        {templates.length === 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => initializeTemplatesMutation.mutate()}
              disabled={initializeTemplatesMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              {initializeTemplatesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Initializing...
                </>
              ) : 'Initialize Templates'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}