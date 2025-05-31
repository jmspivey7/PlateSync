import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Image } from 'lucide-react';

interface WysiwygEditorProps {
  value: string;
  onChange: (content: string) => void;
  variables?: string[];
  placeholder?: string;
}

export function WysiwygEditor({ value, onChange, variables = [], placeholder }: WysiwygEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // Extract just the body content for editing
  const getBodyContent = (html: string) => {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1].trim();
    }
    // If no body tag, just clean up the HTML
    return html
      .replace(/<\/?(html|head|title|meta|style)[^>]*>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .trim();
  };

  // Wrap content back in full HTML structure
  const wrapInHtml = (content: string) => {
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
  };

  const insertVariable = (variable: string) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      const index = range ? range.index : editor.getLength();
      editor.insertText(index, ` ${variable} `);
    }
  };

  const insertImage = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      const index = range ? range.index : editor.getLength();
      // Insert an image with placeholder URL that can be replaced with variables
      editor.insertEmbed(index, 'image', '{{churchLogoUrl}}');
    }
  };

  const handleEditorChange = (content: string) => {
    onChange(wrapInHtml(content));
  };

  // Enhanced toolbar configuration with image support
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['image'],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'align', 'image'
  ];

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <label className="text-base font-medium text-gray-900">Message</label>
        <div className="flex gap-2">
          {/* Insert Logo Button */}
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={insertImage}
            className="bg-white"
          >
            <Image className="h-4 w-4 mr-1" />
            Insert Logo
          </Button>
          
          {/* Variable Insertion Dropdown */}
          {variables.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white">
                  <Plus className="h-4 w-4 mr-1" />
                  Insert Variable
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
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
          )}
        </div>
      </div>

      {/* ReactQuill Editor */}
      <div className="border rounded-md bg-white">
        <ReactQuill
          ref={quillRef}
          value={getBodyContent(value)}
          onChange={handleEditorChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder || 'Start typing your message...'}
          style={{ minHeight: '300px' }}
          theme="snow"
        />
      </div>
    </div>
  );
}