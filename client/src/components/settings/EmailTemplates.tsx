import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCcw, Save } from "lucide-react";

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

interface TemplateTypeInfo {
  id: TemplateType;
  name: string;
  description: string;
  placeholders: string[];
}

// Template type information
const templateTypeInfo: Record<TemplateType, TemplateTypeInfo> = {
  WELCOME_EMAIL: {
    id: 'WELCOME_EMAIL',
    name: 'Welcome Email',
    description: 'Sent to new users when they are added to the system.',
    placeholders: ['{{firstName}}', '{{lastName}}', '{{churchName}}', '{{verificationUrl}}', '{{verificationToken}}']
  },
  PASSWORD_RESET: {
    id: 'PASSWORD_RESET',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset.',
    placeholders: ['{{resetUrl}}']
  },
  DONATION_CONFIRMATION: {
    id: 'DONATION_CONFIRMATION',
    name: 'Donation Receipt',
    description: 'Sent to donors when their donation is recorded.',
    placeholders: ['{{donorName}}', '{{churchName}}', '{{amount}}', '{{date}}', '{{donationId}}']
  },
  COUNT_REPORT: {
    id: 'COUNT_REPORT',
    name: 'Count Report',
    description: 'Sent to report recipients when a count is finalized.',
    placeholders: ['{{recipientName}}', '{{churchName}}', '{{batchName}}', '{{batchDate}}', '{{totalAmount}}', '{{cashAmount}}', '{{checkAmount}}', '{{donationCount}}']
  }
};

export default function EmailTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('WELCOME_EMAIL');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch email templates
  const { 
    data: templates = [], 
    isLoading, 
    isError,
    refetch 
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
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setInitialized(true);
    },
    onError: (error) => {
      toast({
        title: "Initialization failed",
        description: error instanceof Error ? error.message : "Failed to initialize templates",
        variant: "destructive",
      });
    },
  });

  // Update email template
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: number }) => {
      const response = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update email template');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template updated",
        description: "Email template has been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
      });
    },
  });

  // Reset template to default
  const resetTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/email-templates/${id}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset email template');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template reset",
        description: "Email template has been reset to default.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Failed to reset template",
        variant: "destructive",
      });
    },
  });

  // Initialize templates if none exist on component mount
  useEffect(() => {
    if (templates.length === 0 && !isLoading && !isError && !initialized) {
      initializeTemplatesMutation.mutate();
    }
  }, [templates, isLoading, isError, initialized]);

  // Get the current template being viewed
  const currentTemplate = templates.find(t => t.templateType === activeTemplate);

  // Open edit dialog with selected template
  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setIsEditDialogOpen(true);
  };

  // Handle saving template changes
  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        subject: editingTemplate.subject,
        bodyText: editingTemplate.bodyText,
        bodyHtml: editingTemplate.bodyHtml
      });
    }
  };

  // Handle resetting template to default
  const handleResetTemplate = (id: number) => {
    if (confirm("Are you sure you want to reset this template to its default? This will overwrite all your changes.")) {
      resetTemplateMutation.mutate(id);
    }
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
            <p className="text-sm text-gray-600">
              Customize the email templates used throughout the system. You can edit the subject and content of each template.
            </p>
            
            <Tabs value={activeTemplate} onValueChange={(value) => setActiveTemplate(value as TemplateType)}>
              <TabsList className="w-full grid grid-cols-2 md:grid-cols-4">
                {Object.values(templateTypeInfo).map((info) => (
                  <TabsTrigger key={info.id} value={info.id} className="text-xs md:text-sm">
                    {info.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.values(templateTypeInfo).map((info) => (
                <TabsContent key={info.id} value={info.id} className="pt-4 px-1">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">{info.name}</h3>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>

                    {currentTemplate && currentTemplate.templateType === info.id && (
                      <>
                        <div className="space-y-2 border rounded-md p-4 bg-gray-50">
                          <div>
                            <Label className="font-semibold">Subject</Label>
                            <p className="text-sm break-words mt-1">{currentTemplate.subject}</p>
                          </div>
                          <Separator className="my-2" />
                          <div>
                            <Label className="font-semibold">Text Body</Label>
                            <div className="bg-white border rounded-md p-2 mt-1">
                              <pre className="text-xs whitespace-pre-wrap break-words font-mono">{currentTemplate.bodyText}</pre>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <div>
                            <Label className="font-semibold">HTML Body (preview)</Label>
                            <div className="border rounded-md mt-1 bg-white overflow-hidden">
                              <ScrollArea className="h-64 rounded-md">
                                <div className="p-2">
                                  <div dangerouslySetInnerHTML={{ __html: currentTemplate.bodyHtml }} />
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-medium mb-1">Available Placeholders:</h4>
                            <div className="flex flex-wrap gap-1">
                              {info.placeholders.map((placeholder) => (
                                <span 
                                  key={placeholder} 
                                  className="text-xs bg-gray-100 px-2 py-1 rounded-md"
                                >
                                  {placeholder}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 sm:self-end mt-2 sm:mt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetTemplate(currentTemplate.id)}
                              disabled={resetTemplateMutation.isPending}
                              className="border-gray-400"
                            >
                              {resetTemplateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCcw className="h-4 w-4 mr-1" />
                                  Reset to Default
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditTemplate(currentTemplate)}
                              className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                            >
                              Edit Template
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Customize the email template. Use placeholders to include dynamic content.
            </DialogDescription>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    subject: e.target.value
                  })}
                  className="border-gray-400 mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="bodyText">Text Body</Label>
                <Textarea
                  id="bodyText"
                  value={editingTemplate.bodyText}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    bodyText: e.target.value
                  })}
                  rows={12}
                  className="font-mono text-sm border-gray-400 mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="bodyHtml">HTML Body</Label>
                <Textarea
                  id="bodyHtml"
                  value={editingTemplate.bodyHtml}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    bodyHtml: e.target.value
                  })}
                  rows={12}
                  className="font-mono text-sm border-gray-400 mt-1"
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Available Placeholders:</h4>
                <div className="flex flex-wrap gap-1">
                  {templateTypeInfo[editingTemplate.templateType as TemplateType].placeholders.map((placeholder) => (
                    <span 
                      key={placeholder} 
                      className="text-xs bg-gray-100 px-2 py-1 rounded-md"
                    >
                      {placeholder}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={updateTemplateMutation.isPending}
              className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
            >
              {updateTemplateMutation.isPending ? (
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}