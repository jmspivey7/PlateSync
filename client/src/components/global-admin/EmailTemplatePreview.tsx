import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmailTemplatePreviewProps {
  subject: string;
  htmlContent: string;
}

const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({ subject, htmlContent }) => {
  const previewHtml = htmlContent
    .replace(/{{userName}}/g, "John Smith")
    .replace(/{{userEmail}}/g, "john.smith@example.com") 
    .replace(/{{churchName}}/g, "First Church") 
    .replace(/{{churchLogoUrl}}/g, "https://storage.googleapis.com/replit/images/1747409627528_b3a96cd5dc9c6dd54efc39b9d70f5c28.png")
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
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;