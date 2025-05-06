import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, RefreshCcw, Save } from "lucide-react";

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

// Template type information with friendly display names and placeholders
const templateTypeInfo: Record<TemplateType, { name: string; description: string; placeholders: string[] }> = {
  WELCOME_EMAIL: {
    name: 'Welcome Email',
    description: 'Sent to new users when they are added to the system.',
    placeholders: ['{{firstName}}', '{{lastName}}', '{{churchName}}', '{{verificationUrl}}', '{{verificationToken}}']
  },
  PASSWORD_RESET: {
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset.',
    placeholders: ['{{resetUrl}}']
  },
  DONATION_CONFIRMATION: {
    name: 'Donation Receipt',
    description: 'Sent to donors when their donation is recorded.',
    placeholders: ['{{donorName}}', '{{churchName}}', '{{amount}}', '{{date}}', '{{donationId}}', '{{churchLogoUrl}}']
  },
  COUNT_REPORT: {
    name: 'Count Report',
    description: 'Sent to report recipients when a count is finalized.',
    placeholders: ['{{recipientName}}', '{{churchName}}', '{{batchName}}', '{{batchDate}}', '{{totalAmount}}', '{{cashAmount}}', '{{checkAmount}}', '{{donationCount}}']
  }
};

export default function EmailTemplateEditor() {
  const { id } = useParams();
  const templateId = parseInt(id || '0');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [templateData, setTemplateData] = useState<EmailTemplate | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Fetch template data
  const {
    data: template,
    isLoading,
    isError,
    error
  } = useQuery<EmailTemplate>({
    queryKey: [`/api/email-templates/${templateId}`],
    enabled: templateId > 0,
  });

  // Update template data when fetched
  useEffect(() => {
    if (template) {
      setTemplateData(template);
    }
  }, [template]);

  // Check if template ID is valid
  if (templateId <= 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid Template ID</h2>
              <p className="text-gray-600 mb-4">The template ID is invalid or missing.</p>
              <Link href="/settings">
                <Button>Return to Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: Partial<EmailTemplate>) => {
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
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
        className: "bg-white"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/email-templates/${templateId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsFormDirty(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
        className: "bg-white border-red-600"
      });
    },
  });
  
  // Reset template to default
  const resetTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/email-templates/${templateId}/reset`, {
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
    onSuccess: (data) => {
      toast({
        title: "Template reset",
        description: "Email template has been reset to default.",
        variant: "default",
        className: "bg-white"
      });
      setTemplateData(data);
      queryClient.invalidateQueries({ queryKey: [`/api/email-templates/${templateId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsFormDirty(false);
    },
    onError: (error) => {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Failed to reset template",
        variant: "destructive",
        className: "bg-white border-red-600"
      });
    },
  });

  // Handle form changes
  const handleInputChange = (field: keyof EmailTemplate, value: string) => {
    if (templateData) {
      setTemplateData({
        ...templateData,
        [field]: value
      });
      setIsFormDirty(true);
    }
  };

  // Handle form submission
  const handleSave = () => {
    if (templateData) {
      updateTemplateMutation.mutate({
        subject: templateData.subject,
        bodyText: templateData.bodyText,
        bodyHtml: templateData.bodyHtml
      });
    }
  };

  // Confirm reset
  const handleReset = () => {
    if (confirm("Are you sure you want to reset this template to its default? This will discard any customizations.")) {
      resetTemplateMutation.mutate();
    }
  };

  // Handle back button
  const handleBack = () => {
    if (isFormDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.")) {
        setLocation("/settings");
      }
    } else {
      setLocation("/settings");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <p className="mt-4 text-gray-600">Loading template...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Template</h2>
              <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : "Failed to load template data"}</p>
              <Link href="/settings">
                <Button>Return to Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no template data, show error
  if (!templateData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Template Not Found</h2>
              <p className="text-gray-600 mb-4">The requested email template could not be found.</p>
              <Link href="/settings">
                <Button>Return to Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get template info
  const templateInfo = templateTypeInfo[templateData.templateType];

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              className="p-0 hover:bg-transparent"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>Return to Settings</span>
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetTemplateMutation.isPending}
                className="border-gray-400"
              >
                {resetTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4 mr-1" />
                )}
                Reset to Default
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isFormDirty || updateTemplateMutation.isPending}
                className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
              >
                {updateTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
          <CardTitle className="mt-4">{templateInfo.name} Template</CardTitle>
          <p className="text-sm text-gray-600 mt-1">{templateInfo.description}</p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="edit">Edit Content</TabsTrigger>
              <TabsTrigger value="preview">Preview HTML</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="space-y-6">
              <div>
                <Label htmlFor="subject" className="font-medium">Subject</Label>
                <Input
                  id="subject"
                  value={templateData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="mt-1 border-gray-400"
                />
              </div>
              
              <div>
                <Label htmlFor="bodyText" className="font-medium">Text Version</Label>
                <p className="text-sm text-gray-500 mb-1">
                  This version is sent to email clients that can't display HTML.
                </p>
                <Textarea
                  id="bodyText"
                  value={templateData.bodyText}
                  onChange={(e) => handleInputChange('bodyText', e.target.value)}
                  rows={12}
                  className="font-mono text-sm mt-1 border-gray-400"
                />
              </div>
              
              <div>
                <Label htmlFor="bodyHtml" className="font-medium">HTML Version</Label>
                <p className="text-sm text-gray-500 mb-1">
                  This version is displayed in most email clients.
                </p>
                <Textarea
                  id="bodyHtml"
                  value={templateData.bodyHtml}
                  onChange={(e) => handleInputChange('bodyHtml', e.target.value)}
                  rows={15}
                  className="font-mono text-sm mt-1 border-gray-400"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium mb-2">Available Placeholders:</h3>
                <div className="flex flex-wrap gap-2">
                  {templateInfo.placeholders.map((placeholder) => (
                    <div 
                      key={placeholder} 
                      className="bg-white px-3 py-1 text-sm rounded-full border border-gray-300"
                    >
                      {placeholder}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These placeholders will be replaced with actual values when the email is sent.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Subject</h3>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mt-1">
                    {templateData.subject}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-2">HTML Preview</h3>
                  <div className="border rounded-md bg-white overflow-hidden">
                    <ScrollArea className="h-[500px]">
                      <div className="p-4">
                        {templateData.templateType === 'DONATION_CONFIRMATION' ? (
                          <div dangerouslySetInnerHTML={{ 
                            __html: templateData.bodyHtml
                              .replace(/{{churchLogoUrl}}/g, 
                                'https://images.squarespace-cdn.com/content/v1/676190801265eb0dc09c3768/ba699d4e-a589-4014-a0d7-923e8ba814d6/redeemer+logos_all+colors_2020.11_black.png'
                              )
                              .replace(/max-width: \d+px/g, 'max-width: 375px')
                              .replace(/max-height: \d+px/g, 'max-height: 150px')
                          }} />
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: templateData.bodyHtml }} />
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Placeholders will be replaced with actual values when the email is sent.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}