import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus } from 'lucide-react';

interface WysiwygEditorProps {
  value: string;
  onChange: (content: string) => void;
  variables?: string[];
  placeholder?: string;
}

export function WysiwygEditor({ value, onChange, variables = [], placeholder }: WysiwygEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // Convert HTML to visual content for the editor
  const convertHtmlToVisual = (html: string) => {
    // Remove email wrapper elements but keep content formatting
    return html
      .replace(/<\/?(html|head|body)[^>]*>/gi, '')
      .replace(/<title[^>]*>.*?<\/title>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .trim();
  };

  // Convert visual content back to proper email HTML
  const convertVisualToHtml = (content: string) => {
    // Wrap in basic email structure if it doesn't exist
    if (!content.includes('<html>')) {
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    ${content}
</body>
</html>`;
    }
    return content;
  };

  const insertVariable = (variable: string) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      const index = range ? range.index : editor.getLength();
      editor.insertText(index, variable);
    }
  };

  const handleEditorChange = (content: string) => {
    const htmlContent = convertVisualToHtml(content);
    onChange(htmlContent);
  };

  // Simple toolbar configuration
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'align'
  ];

  return (
    <div className="space-y-3">
      {/* Variable Insertion Dropdown */}
      {variables.length > 0 && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700">Message</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Insert Variable
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {variables.map((variable) => (
                <DropdownMenuItem
                  key={variable}
                  onClick={() => insertVariable(variable)}
                  className="cursor-pointer"
                >
                  {variable}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ReactQuill Editor */}
      <div className="border rounded-md bg-white">
        <ReactQuill
          ref={quillRef}
          value={convertHtmlToVisual(value)}
          onChange={handleEditorChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder || 'Start typing your message...'}
          style={{ minHeight: '300px' }}
        />
      </div>
    </div>
  );
}