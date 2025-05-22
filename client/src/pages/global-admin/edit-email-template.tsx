import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
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
        
        const response = await fetch(`/api/email-templates/system/${templateId}`);
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
      
      const response = await fetch(`/api/email-templates/system/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
      
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={() => setLocation('/global-admin/settings')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
              <h1 className="text-3xl font-bold leading-tight text-gray-900">
                {getTemplateTitle()}
              </h1>
            </div>
          </div>
        </header>

        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <Card>
                <CardHeader>
                  <CardTitle>Edit {getTemplateTitle()}</CardTitle>
                  <p className="text-sm text-gray-500">
                    Template ID: {template.id} | Type: {template.templateType}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}