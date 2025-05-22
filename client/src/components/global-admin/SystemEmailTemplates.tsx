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
}

export default function SystemEmailTemplates() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);

  // Predefined template data with correct IDs and order
  const templateInfo = [
    {
      id: 30,
      templateType: 'WELCOME_EMAIL',
      title: 'Welcome Email',
      description: 'Welcome to PlateSync'
    },
    {
      id: 31,
      templateType: 'PASSWORD_RESET', 
      title: 'Password Reset',
      description: 'Reset Your PlateSync Password'
    },
    {
      id: 32,
      templateType: 'EMAIL_VERIFICATION',
      title: 'Email Verification', 
      description: 'Verify Your PlateSync Account'
    }
  ];

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading system email templates...');
      
      // Load all three templates directly by ID
      const [welcomeRes, passwordRes, verificationRes] = await Promise.all([
        fetch('/api/email-templates/system/30'),
        fetch('/api/email-templates/system/31'),
        fetch('/api/email-templates/system/32')
      ]);

      const loadedTemplates: SystemTemplate[] = [];

      if (welcomeRes.ok) {
        const welcomeData = await welcomeRes.json();
        console.log('✅ Loaded Welcome Email template:', welcomeData.id);
        loadedTemplates.push(welcomeData);
      } else {
        console.log('❌ Failed to load Welcome Email template');
      }

      if (passwordRes.ok) {
        const passwordData = await passwordRes.json();
        console.log('✅ Loaded Password Reset template:', passwordData.id);
        loadedTemplates.push(passwordData);
      } else {
        console.log('❌ Failed to load Password Reset template');
      }

      if (verificationRes.ok) {
        const verificationData = await verificationRes.json();
        console.log('✅ Loaded Email Verification template:', verificationData.id);
        loadedTemplates.push(verificationData);
      } else {
        console.log('❌ Failed to load Email Verification template');
      }

      // Sort templates by ID to ensure correct order
      loadedTemplates.sort((a, b) => a.id - b.id);
      
      console.log('🔍 Final loaded templates:', loadedTemplates.map(t => `ID ${t.id}: ${t.templateType}`));
      setTemplates(loadedTemplates);
      
    } catch (error) {
      console.error('❌ Error loading system email templates:', error);
      toast({
        title: "Loading failed",
        description: "Failed to load system email templates",
        variant: "destructive",
        className: "bg-white border-red-600"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit template
  const handleEditTemplate = (template: SystemTemplate) => {
    console.log('🔍 Clicking template:', template.id, template.templateType);
    setLocation(`/global-admin/edit-email-template/${template.id}`);
  };

  // Get template info by ID
  const getTemplateInfo = (id: number) => {
    return templateInfo.find(info => info.id === id) || {
      title: 'Unknown Template',
      description: 'Unknown template type'
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
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
            {templates.length > 0 ? templates.map((template) => {
              const info = getTemplateInfo(template.id);
              return (
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
                          {info.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {info.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-400 group-hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-6 text-center text-gray-500">
                No system email templates found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}