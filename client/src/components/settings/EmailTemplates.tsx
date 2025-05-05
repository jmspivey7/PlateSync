import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Edit } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Define template types
type TemplateType = 'WELCOME_EMAIL' | 'PASSWORD_RESET' | 'DONATION_CONFIRMATION' | 'COUNT_REPORT';

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

  // Initialize templates if none exist on component mount
  useEffect(() => {
    if (templates.length === 0 && !isLoading && !isError && !initialized) {
      initializeTemplatesMutation.mutate();
    }
  }, [templates, isLoading, isError, initialized]);

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Email Templates</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
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
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Customize the email templates used throughout the system. Click the Edit button to view and modify a template.
              </p>
              <Button
                onClick={() => initializeTemplatesMutation.mutate()}
                disabled={initializeTemplatesMutation.isPending}
                variant="outline"
                size="sm"
                className="border-gray-400"
              >
                {initializeTemplatesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh Templates"
                )}
              </Button>
            </div>
            
            <Table className="border border-gray-400 rounded-md overflow-hidden">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">Template Name</TableHead>
                  <TableHead className="font-bold">Customized</TableHead>
                  <TableHead className="font-bold">Last Edited</TableHead>
                  <TableHead className="font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {templateTypeInfo[template.templateType]?.name || template.templateType}
                    </TableCell>
                    <TableCell>{isTemplateCustomized(template) ? "YES" : "NO"}</TableCell>
                    <TableCell>{formatLastEdited(template)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}