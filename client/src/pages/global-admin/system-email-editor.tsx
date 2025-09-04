import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import GlobalAdminHeader from '@/components/global-admin/GlobalAdminHeader';

interface SystemTemplate {
  id: number;
  templateType: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export default function SystemEmailEditor() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [welcomeTemplate, setWelcomeTemplate] = useState<SystemTemplate>({
    id: 30,
    templateType: 'WELCOME_EMAIL',
    subject: '',
    bodyHtml: '',
    bodyText: ''
  });
  
  const [passwordTemplate, setPasswordTemplate] = useState<SystemTemplate>({
    id: 31,
    templateType: 'PASSWORD_RESET',
    subject: '',
    bodyHtml: '',
    bodyText: ''
  });

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      
      // Load both templates directly
      const [welcomeRes, passwordRes] = await Promise.all([
        fetch('/api/email-templates/system/30'),
        fetch('/api/email-templates/system/31')
      ]);

      if (welcomeRes.ok) {
        const welcomeData = await welcomeRes.json();
        setWelcomeTemplate(welcomeData);
      }

      if (passwordRes.ok) {
        const passwordData = await passwordRes.json();
        setPasswordTemplate(passwordData);
      }
      
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async (template: SystemTemplate) => {
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/email-templates/system/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${template.templateType === 'WELCOME_EMAIL' ? 'Welcome' : 'Password Reset'} template updated successfully`
        });
      } else {
        throw new Error('Failed to save template');
      }
      
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalAdminHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading email templates...</p>
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
            <div className="h-7 w-7 bg-[#d35f5f] rounded mr-3 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✉</span>
            </div>
            <h2 className="text-2xl font-bold">System Email Templates</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#d35f5f] text-[#d35f5f] hover:bg-[#d35f5f]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/settings?tab=email-templates")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </div>

        <Tabs defaultValue="welcome" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="welcome">Welcome Email</TabsTrigger>
                  <TabsTrigger value="password">Password Reset</TabsTrigger>
                </TabsList>
                
                <TabsContent value="welcome">
                  <Card>
                    <CardHeader>
                      <CardTitle>Welcome Email Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject Line
                        </label>
                        <Input
                          value={welcomeTemplate.subject}
                          onChange={(e) => setWelcomeTemplate({
                            ...welcomeTemplate,
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
                          value={welcomeTemplate.bodyHtml}
                          onChange={(e) => setWelcomeTemplate({
                            ...welcomeTemplate,
                            bodyHtml: e.target.value
                          })}
                          placeholder="HTML email content"
                          rows={10}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text Body
                        </label>
                        <Textarea
                          value={welcomeTemplate.bodyText}
                          onChange={(e) => setWelcomeTemplate({
                            ...welcomeTemplate,
                            bodyText: e.target.value
                          })}
                          placeholder="Plain text email content"
                          rows={6}
                        />
                      </div>
                      
                      <Button
                        onClick={() => saveTemplate(welcomeTemplate)}
                        disabled={isSaving}
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Welcome Template'}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Password Reset Email Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject Line
                        </label>
                        <Input
                          value={passwordTemplate.subject}
                          onChange={(e) => setPasswordTemplate({
                            ...passwordTemplate,
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
                          value={passwordTemplate.bodyHtml}
                          onChange={(e) => setPasswordTemplate({
                            ...passwordTemplate,
                            bodyHtml: e.target.value
                          })}
                          placeholder="HTML email content"
                          rows={10}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text Body
                        </label>
                        <Textarea
                          value={passwordTemplate.bodyText}
                          onChange={(e) => setPasswordTemplate({
                            ...passwordTemplate,
                            bodyText: e.target.value
                          })}
                          placeholder="Plain text email content"
                          rows={6}
                        />
                      </div>
                      
                      <Button
                        onClick={() => saveTemplate(passwordTemplate)}
                        disabled={isSaving}
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Password Reset Template'}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
      </main>
    </div>
  );
}