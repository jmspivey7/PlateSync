import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import GlobalAdminHeader from '@/components/global-admin/GlobalAdminHeader';

interface EmailTemplate {
  id: number;
  templateType: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  churchId: string;
}

export default function EditEmailTemplate() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const templateId = parseInt(id);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    bodyHtml: '',
    bodyText: ''
  });

  // Load template data
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        console.log(`🔍 Loading template ID: ${templateId}`);
        
        // Get the JWT token from localStorage for Global Admin authentication
        const token = localStorage.getItem('globalAdminToken');
        
        const response = await fetch(`/api/email-templates/system/${templateId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`🔍 Response status: ${response.status}`);
        
        if (response.ok) {
          const templateData = await response.json();
          console.log(`🔍 Template loaded:`, templateData);
          
          setTemplate(templateData);
          setFormData({
            subject: templateData.subject || '',
            bodyHtml: templateData.bodyHtml || '',
            bodyText: templateData.bodyText || ''
          });
          
          console.log(`✅ Successfully loaded template ${templateData.id}`);
        } else {
          console.error(`❌ Failed to load template: ${response.status}`);
          toast({
            title: 'Template not found',
            description: 'The requested template could not be found.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('❌ Error loading template:', error);
        toast({
          title: 'Error',
          description: 'Failed to load template data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isNaN(templateId)) {
      loadTemplate();
    } else {
      setIsLoading(false);
      toast({
        title: 'Invalid template ID',
        description: 'The template ID is not valid.',
        variant: 'destructive'
      });
    }
  }, [templateId, toast]);

  const handleSave = async () => {
    if (!template) return;
    
    try {
      setIsSaving(true);
      console.log(`💾 Saving template ${template.id}`);
      
      // Get the JWT token from localStorage for Global Admin authentication
      const token = localStorage.getItem('globalAdminToken');
      
      const response = await fetch(`/api/email-templates/system/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: formData.subject,
          bodyHtml: formData.bodyHtml,
          bodyText: formData.bodyText
        })
      });

      if (response.ok) {
        console.log(`✅ Template ${template.id} saved successfully`);
        toast({
          title: 'Success',
          description: 'Email template updated successfully'
        });
      } else {
        throw new Error(`Failed to save template: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTemplateTitle = () => {
    if (!template) return 'Email Template';
    return template.templateType === 'WELCOME_EMAIL' ? 'Welcome Email Template' : 'Password Reset Email Template';
  };

  // Function to render preview with sample data
  const renderPreview = (html: string) => {
    // Replace template variables with sample data for preview
    return html
      .replace(/\{\{churchName\}\}/g, 'Sample Church')
      .replace(/\{\{userName\}\}/g, 'John Doe')
      .replace(/\{\{USER_NAME\}\}/g, 'John Doe')
      .replace(/\{\{userEmail\}\}/g, 'john.doe@email.com')
      .replace(/\{\{churchLogoUrl\}\}/g, 'https://repl-plates-image-repo.s3.amazonaws.com/logos/sample-church-logo.png')
      .replace(/\{\{plateSyncLogoUrl\}\}/g, 'https://repl-plates-image-repo.s3.amazonaws.com/logos/logo-with-text.png')
      .replace(/\{\{resetUrl\}\}/g, 'https://yourchurch.platesync.com/reset-password?token=sample-token')
      .replace(/\{\{loginUrl\}\}/g, 'https://yourchurch.platesync.com/login')
      .replace(/\{\{supportEmail\}\}/g, 'support@platesync.com');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalAdminHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading email template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalAdminHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Template not found</p>
            <Button onClick={() => setLocation('/global-admin/settings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
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
              <span className="text-white text-xs font-bold">✉</span>
            </div>
            <h2 className="text-2xl font-bold">{getTemplateTitle()}</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/settings?tab=email-templates")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </div>

        <Card>
                <CardHeader>
                  <CardTitle>Edit {getTemplateTitle()}</CardTitle>
                  <p className="text-sm text-gray-500">
                    Template ID: {template.id} | Type: {template.templateType}
                  </p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="edit" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="edit">Edit Template</TabsTrigger>
                      <TabsTrigger value="preview">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="edit" className="space-y-6 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject Line
                        </label>
                        <Input
                          value={formData.subject}
                          onChange={(e) => setFormData({
                            ...formData,
                            subject: e.target.value
                          })}
                          placeholder="Email subject line"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          HTML Body
                        </label>
                        <Textarea
                          value={formData.bodyHtml}
                          onChange={(e) => setFormData({
                            ...formData,
                            bodyHtml: e.target.value
                          })}
                          placeholder="HTML email content"
                          rows={12}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available variables: {"{{churchName}}, {{userName}}, {{churchLogoUrl}}, {{plateSyncLogoUrl}}"}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text Body (Plain Text Fallback)
                        </label>
                        <Textarea
                          value={formData.bodyText}
                          onChange={(e) => setFormData({
                            ...formData,
                            bodyText: e.target.value
                          })}
                          placeholder="Plain text email content"
                          rows={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Plain text version for email clients that don't support HTML
                        </p>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-[#69ad4c] hover:bg-[#5a9440] text-white"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? 'Saving...' : 'Save Template'}
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="preview" className="mt-6">
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h3 className="font-medium text-gray-900 mb-2">Email Preview</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            This shows how the email will look with sample data
                          </p>
                          
                          <div className="bg-white border rounded-lg p-4 mb-4">
                            <div className="border-b pb-3 mb-4">
                              <h4 className="font-medium text-gray-700">Subject:</h4>
                              <p className="text-gray-900">{formData.subject}</p>
                            </div>
                            
                            <div className="border rounded-lg overflow-hidden">
                              <div 
                                className="max-h-96 overflow-y-auto"
                                dangerouslySetInnerHTML={{ 
                                  __html: renderPreview(formData.bodyHtml) 
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="bg-gray-100 rounded-lg p-4">
                            <h4 className="font-medium text-gray-700 mb-2">Plain Text Version:</h4>
                            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                              {renderPreview(formData.bodyText)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
      </main>
    </div>
  );
}