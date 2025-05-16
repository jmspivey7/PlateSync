import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Edit } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Define template types
type TemplateType = 'WELCOME_EMAIL' | 'PASSWORD_RESET' | 'DONATION_CONFIRMATION' | 'COUNT_REPORT';

// Define Account Owner template types separately (for better type safety)
type AccountOwnerTemplateType = 'DONATION_CONFIRMATION' | 'COUNT_REPORT';

// Define Global Admin template types separately
type GlobalAdminTemplateType = 'WELCOME_EMAIL' | 'PASSWORD_RESET';

interface EmailTemplate {
  id: number;
  templateType: TemplateType;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  churchId: string;
  createdAt: string;
  updatedAt: string;
}

// Template type information with friendly display names
const templateTypeInfo: Record<TemplateType, { name: string; description: string }> = {
  WELCOME_EMAIL: {
    name: 'Welcome Email',
    description: 'Sent to new users when they are added to the system.'
  },
  PASSWORD_RESET: {
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset.'
  },
  DONATION_CONFIRMATION: {
    name: 'Donation Receipt',
    description: 'Sent to donors when their donation is recorded.'
  },
  COUNT_REPORT: {
    name: 'Count Report',
    description: 'Sent to report recipients when a count is finalized.'
  }
};

export default function EmailTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch email templates
  const { 
    data: templates = [], 
    isLoading, 
    isError 
  } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    enabled: true,
  });

  // Initialize templates if none exist
  const initializeTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/email-templates/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize email templates');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Templates initialized",
        description: "Default email templates have been created successfully.",
        variant: "default",
        className: "bg-white"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
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
    // As an Account Owner, we only expect 2 templates (DONATION_CONFIRMATION and COUNT_REPORT)
    const requiredTemplateCount = 2;
    // Check if we have the required templates for Account Owners
    const accountOwnerTemplateTypes: AccountOwnerTemplateType[] = ['DONATION_CONFIRMATION', 'COUNT_REPORT'];
    const existingTemplateTypes = Array.isArray(templates) ? templates.map(t => t.templateType) : [];
    const hasRequiredTemplates = accountOwnerTemplateTypes.every(type => 
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

  // Format date for display or return "Never" if dates are the same
  const formatLastEdited = (template: EmailTemplate): string => {
    if (isTemplateCustomized(template)) {
      return format(new Date(template.updatedAt), "MMM d, yyyy 'at' h:mm a");
    }
    return "Never";
  };

  // Handle edit button click - navigate to edit page
  const handleEditTemplate = (template: EmailTemplate) => {
    setLocation(`/email-template/${template.id}`);
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Email Templates</h3>
      {isLoading ? (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Loading email templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-6 border rounded-md">
          <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No email templates found</p>
          <p className="text-sm text-gray-500 mt-1">
            Initialize default templates to customize emails sent by the system
          </p>
          <Button 
            onClick={() => initializeTemplatesMutation.mutate()}
            disabled={initializeTemplatesMutation.isPending}
            className="mt-4 bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
          >
            {initializeTemplatesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Default Templates"
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-2">
            Customize the email templates used throughout the system. Click on any template to view and modify it.
          </p>
          
          <div className="border border-gray-400 rounded-md overflow-hidden">
            <div className="divide-y">
              {Array.isArray(templates) && templates.length > 0 ? [...templates]
                // Filter to only show account owner templates (DONATION_CONFIRMATION and COUNT_REPORT)
                .filter(template => 
                  (template.templateType === 'DONATION_CONFIRMATION' || 
                   template.templateType === 'COUNT_REPORT') as boolean
                )
                .sort((a, b) => {
                  // Define the order of Account Owner template types
                  const templateOrder: Record<string, number> = {
                    'DONATION_CONFIRMATION': 1,
                    'COUNT_REPORT': 2
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
                  <div className="space-y-1">
                    <div className="font-medium text-base flex items-center justify-between">
                      <span>{templateTypeInfo[template.templateType]?.name || template.templateType}</span>
                      <span className="text-[#69ad4c] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center text-sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Template
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1 flex flex-col sm:flex-row sm:gap-4">
                      <span className="flex items-center">
                        <span className="font-medium mr-1">Last Edited:</span> 
                        {formatLastEdited(template)}
                      </span>
                      
                      {isTemplateCustomized(template) && (
                        <span className="flex items-center">
                          <span className="font-medium mr-1">Customized By:</span> 
                          System Administrator
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
              : <div className="p-4 text-gray-500 italic">No email templates available</div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}