import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Mail, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemTemplate {
  id: number;
  templateType: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  title?: string;
  description?: string;
}

export default function SystemEmailTemplates() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates from database
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Loading system email templates from API...');
        
        // Get the JWT token from localStorage for Global Admin authentication
        const token = localStorage.getItem('globalAdminToken');
        
        const response = await fetch('/api/email-templates/system', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`🔍 Templates API response status: ${response.status}`);
        
        if (response.ok) {
          const templatesData = await response.json();
          console.log(`🔍 Loaded ${templatesData.length} templates:`, templatesData);
          
          // Map database templates to display format
          const mappedTemplates = templatesData.map((template: any) => ({
            id: template.id,
            templateType: template.templateType,
            subject: template.subject,
            bodyHtml: template.bodyHtml,
            bodyText: template.bodyText,
            title: getTemplateTitle(template.templateType),
            description: template.subject || getTemplateTitle(template.templateType)
          }));
          
          setTemplates(mappedTemplates);
          console.log(`✅ Successfully loaded ${mappedTemplates.length} templates`);
        } else {
          console.error(`❌ Failed to load templates: ${response.status}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          toast({
            title: 'Templates not found',
            description: 'Could not load system email templates. Please check your authentication.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('❌ Error loading templates:', error);
        toast({
          title: 'Error',
          description: 'Failed to load template data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [toast]);

  // Helper function to get user-friendly template titles
  const getTemplateTitle = (templateType: string): string => {
    switch (templateType) {
      case 'WELCOME_EMAIL':
        return 'Welcome Email';
      case 'PASSWORD_RESET':
        return 'Password Reset';
      case 'EMAIL_VERIFICATION':
        return 'Email Verification';
      default:
        return templateType.replace('_', ' ');
    }
  };

  // Handle edit template
  const handleEditTemplate = (template: any) => {
    console.log('🔍 Clicking template:', template.id, template.templateType);
    setLocation(`/global-admin/edit-email-template/${template.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Email Templates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage system-wide email templates that are used across all churches.
          </p>
          
          <div className="border border-gray-400 rounded-md overflow-hidden mt-4 p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading templates...</span>
            </div>
          </div>
        </div>
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
        
        {templates.length === 0 ? (
          <div className="border border-gray-400 rounded-md overflow-hidden mt-4 p-8">
            <div className="text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No templates found.</p>
              <p className="text-xs text-gray-400 mt-2">Templates may not be loaded or authentication failed.</p>
            </div>
          </div>
        ) : (
          <div className="border border-gray-400 rounded-md overflow-hidden mt-4">
            <div className="divide-y">
              {templates.map((template) => (
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
                        <div className="text-sm font-medium text-gray-900">
                          {template.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {template.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          ID: {template.id} | Type: {template.templateType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-400 group-hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}