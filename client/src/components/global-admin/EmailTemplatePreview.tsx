import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import plateSyncLogo from "@/assets/platesync-logo.png";

interface EmailTemplatePreviewProps {
  subject: string;
  htmlContent: string;
}

const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({ subject, htmlContent }) => {
  // Convert logo to base64 for inline embedding in email template preview
  const logoSrc = plateSyncLogo;
  
  const previewHtml = htmlContent
    .replace(/{{userName}}/g, "John Smith")
    .replace(/{{userEmail}}/g, "john.smith@example.com") 
    .replace(/{{churchName}}/g, "First Church") 
    .replace(/{{CHURCH_LOGO_URL}}/g, logoSrc)
    .replace(/{{churchLogoUrl}}/g, logoSrc)
    .replace(/{{loginUrl}}/g, "https://platesync.app/login")
    .replace(/{{resetUrl}}/g, "https://platesync.app/reset-password?token=example-token-123456")
    .replace(/{{verificationUrl}}/g, "https://platesync.app/verify?token=example-token-123456");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Subject Preview</h3>
        <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mt-1">
          {subject}
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">HTML Preview</h3>
        <div className="border rounded-md bg-white overflow-hidden">
          <ScrollArea className="h-[500px]">
            <div className="p-4">
              <iframe 
                srcDoc={previewHtml}
                style={{ width: '100%', height: '600px', border: 'none' }}
                title="Email Template Preview"
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;