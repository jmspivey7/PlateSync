import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Eye, Mail, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { useAuth } from '@/hooks/useAuth';

// Template type information
const templateTypeInfo = {
  DONATION_CONFIRMATION: {
    name: 'Donation Receipt',
    description: 'Sent to donors when their donation is recorded.',
    variables: ['{{churchName}}', '{{donorName}}', '{{amount}}', '{{date}}', '{{paymentMethod}}', '{{churchLogoUrl}}']
  },
  COUNT_REPORT: {
    name: 'Count Report',
    description: 'Weekly summary report sent to administrators.',
    variables: ['{{churchName}}', '{{weekRange}}', '{{totalAmount}}', '{{batchCount}}', '{{churchLogoUrl}}']
  },
  WELCOME_EMAIL: {
    name: 'Welcome Email',
    description: 'Welcome message for new users.',
    variables: ['{{firstName}}', '{{lastName}}', '{{churchName}}', '{{userRole}}', '{{churchLogoUrl}}']
  }
};

export default function EmailTemplateEditor() {
  const { user } = useAuth();
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('edit');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Fetch template data
  const { data: templateData, isLoading } = useQuery({
    queryKey: [`/api/email-templates/${id}`],
    queryFn: () => fetch(`/api/email-templates/${id}`).then(res => res.json()),
  });



  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template Updated',
        description: 'Email template has been saved successfully.',
      });
      setIsFormDirty(false);
      queryClient.invalidateQueries({ queryKey: [`/api/email-templates/${id}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    },
  });

  // Reset template mutation
  const resetTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/email-templates/${id}/reset`, 'POST');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template Reset',
        description: 'Template has been reset to default.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/email-templates/${id}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset template',
        variant: 'destructive',
      });
    },
  });

  // Set form values when template data loads
  useEffect(() => {
    if (templateData) {
      setSubject(templateData.subject || '');
      setBodyHtml(templateData.bodyHtml || '');
      setBodyText(templateData.bodyText || '');
    }
  }, [templateData]);

  // Track form changes
  useEffect(() => {
    if (templateData) {
      const hasChanges = 
        subject !== (templateData.subject || '') ||
        bodyHtml !== (templateData.bodyHtml || '') ||
        bodyText !== (templateData.bodyText || '');
      setIsFormDirty(hasChanges);
    }
  }, [subject, bodyHtml, bodyText, templateData]);

  const handleSave = () => {
    updateTemplateMutation.mutate({
      subject,
      bodyHtml,
      bodyText,
    });
  };

  const handleReset = () => {
    resetTemplateMutation.mutate();
  };

  const handleBack = () => {
    setLocation('/settings');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Template not found</h2>
          <Button onClick={handleBack} className="mt-4">
            Return to Settings
          </Button>
        </div>
      </div>
    );
  }

  // Get template info
  const templateInfo = templateTypeInfo[templateData.templateType as keyof typeof templateTypeInfo];

  // Process HTML for preview with sample data
  const currentYear = new Date().getFullYear();
  
  // Debug user data for church logo
  console.log('User data for email template:', {
    user,
    churchName: user?.churchName,
    churchLogoUrl: user?.churchLogoUrl,
    hasChurchLogoUrl: !!user?.churchLogoUrl
  });
  
  const sampleData = {
    churchName: user?.churchName || 'Sample Church',
    churchLogoUrl: user?.churchLogoUrl || '',
    currentYear: currentYear.toString(),
    firstName: 'John',
    lastName: 'Doe',
    donorName: 'John Doe',
    amount: '100.00',
    date: new Date().toLocaleDateString(),
    paymentMethod: 'Cash',
    weekRange: 'Jan 1-7, 2025',
    totalAmount: '2,500.00',
    batchCount: '5',
    userRole: 'Administrator',
    receiptNumber: 'RCP-2025-001234',
    batchNumber: 'B-2025-123',
    usherName: 'Jane Smith',
    reportDate: 'May 31, 2025'
  };

  let processedHtml = bodyHtml;
  let processedSubject = templateData.subject;

  // Handle logo conditional logic FIRST, before variable replacement
  if (!user?.churchLogoUrl) {
    // Remove the entire logo conditional block when no logo is available
    processedHtml = processedHtml.replace(/\{\{#if churchLogoUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  } else {
    // Replace logo conditional with actual image tag
    processedHtml = processedHtml.replace(
      /\{\{#if churchLogoUrl\}\}([\s\S]*?)\{\{\/if\}\}/g,
      `<div style="text-align: center; margin-bottom: 20px;">
        <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" style="max-width: 200px; height: auto;" />
      </div>`
    );
  }

  // Create formatted HTML for WYSIWYG editor
  const wysiwygHtml = bodyHtml
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return '<p><br></p>'; // Empty line becomes paragraph with break
      
      // Special formatting for different types of content
      if (trimmedLine.startsWith('Donation Amount:') || 
          trimmedLine.startsWith('Date:') || 
          trimmedLine.startsWith('Payment Method:')) {
        return `<p><strong>${trimmedLine}</strong></p>`;
      }
      
      if (trimmedLine.includes('This is an automated email')) {
        return `<p><em>${trimmedLine}</em></p>`;
      }
      
      if (trimmedLine.includes('©') && trimmedLine.includes('All rights reserved')) {
        return `<p><small>${trimmedLine}</small></p>`;
      }
      
      return `<p>${trimmedLine}</p>`;
    })
    .join('');

  // Now replace all variables in both HTML and subject
  Object.entries(sampleData).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const replacement = value || '';
    processedHtml = processedHtml.replace(regex, replacement);
    processedSubject = processedSubject.replace(regex, replacement);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar matching Global Admin style */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {templateInfo.name} Template
          </h1>
        </div>
        
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Button>
      </div>

      {/* Main content area - exactly matching Global Admin layout */}
      <div className="p-6">
        <Card className="w-full max-w-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Edit {templateInfo.name} Template
            </CardTitle>
            <p className="text-sm text-gray-600">
              Template ID: {templateData.id} | Type: {templateData.templateType}
            </p>
          </CardHeader>
          
          <CardContent className="w-full max-w-none">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit" className="flex items-center gap-2">
                    Edit Template
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="edit" className="mt-0 space-y-6">
                <div>
                  <Label htmlFor="subject" className="text-base font-medium text-gray-900">
                    Subject Line
                  </Label>
                  <Input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-2"
                    placeholder="Enter email subject..."
                  />
                </div>

                <div>
                  {templateData.templateType === 'DONATION_CONFIRMATION' ? (
                    <WysiwygEditor
                      value={wysiwygHtml}
                      onChange={setBodyHtml}
                      variables={templateInfo.variables}
                      placeholder="Compose your donation receipt message..."
                    />
                  ) : (
                    <>
                      <Label htmlFor="bodyHtml" className="text-base font-medium text-gray-900">
                        HTML Body
                      </Label>
                      <Textarea
                        id="bodyHtml"
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        className="mt-2 min-h-[300px] font-mono text-sm"
                        placeholder="Enter HTML content..."
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Available variables: {templateInfo.variables?.join(', ')}
                      </p>
                    </>
                  )}
                </div>

                {templateData.templateType !== 'DONATION_CONFIRMATION' && (
                  <div>
                    <Label htmlFor="bodyText" className="text-base font-medium text-gray-900">
                      Text Body (Plain Text Fallback)
                    </Label>
                    <Textarea
                      id="bodyText"
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      className="mt-2 min-h-[200px] font-mono text-sm"
                      placeholder="Enter plain text version..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Plain text version for email clients that don't support HTML.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-0 space-y-6 w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This shows how the email will look with sample data
                </p>
                
                <div className="border border-gray-200 rounded-lg bg-white w-full">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">Subject:</p>
                    <p className="text-sm text-gray-700">{processedSubject || 'No subject'}</p>
                  </div>
                  
                  <div className="p-6">
                    <iframe 
                      srcDoc={processedHtml}
                      style={{ width: '100%', height: '600px', border: 'none' }}
                      title="Email Template Preview"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Action buttons moved outside card for full tab width */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetTemplateMutation.isPending}
            className="flex items-center gap-2"
          >
            {resetTemplateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset to Default
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!isFormDirty || updateTemplateMutation.isPending}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {updateTemplateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}