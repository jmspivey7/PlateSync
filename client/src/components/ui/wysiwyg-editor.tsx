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

  // Convert plain text to HTML paragraphs for display in editor
  const convertTextToHtml = (text: string) => {
    if (!text || text.trim() === '') return '<p><br></p>';
    
    // Check if it's already HTML
    if (text.includes('<') && text.includes('>')) {
      return text;
    }
    
    // Convert plain text to HTML paragraphs
    return text
      .split('\n')
      .map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return '<p><br></p>';
        return `<p>${trimmedLine}</p>`;
      })
      .join('');
  };

  // Convert HTML back to plain text format for storage
  const convertHtmlToText = (html: string) => {
    return html
      .replace(/<p><br><\/p>/g, '\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  const insertVariable = (variable: string) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      const index = range ? range.index : editor.getLength();
      editor.insertText(index, ` ${variable} `);
    }
  };



  const handleEditorChange = (content: string) => {
    // Convert HTML content back to plain text for storage
    const plainText = convertHtmlToText(content);
    onChange(plainText);
  };

  // Toolbar configuration
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
      {/* Controls */}
      <div className="flex justify-between items-center">
        <label className="text-base font-medium text-gray-900">Message</label>
        <div className="flex gap-2">
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
          value={convertTextToHtml(value)}
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