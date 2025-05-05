import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';

const CsvImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        const response = await fetch('/api/members/import', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to import members');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Import error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setImportStatus('success');
      setStatusMessage(`Successfully imported ${data.importedCount} members.`);
      setProgress(100);
      
      // Invalidate the members query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      toast({
        title: 'Import Successful',
        description: `${data.importedCount} members imported successfully.`,
        className: 'bg-[#48BB78] text-white',
      });
    },
    onError: (error) => {
      setImportStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An error occurred during import');
      setProgress(0);
      
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import members',
        variant: 'destructive',
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setImportStatus('error');
      setStatusMessage('Please upload a valid CSV file');
      return;
    }

    setFile(selectedFile);
    setImportStatus('idle');
    setStatusMessage(null);
    setProgress(0);
    
    // Preview the CSV data
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        // Check if CSV has the expected headers
        const requiredHeaders = ['First Name', 'Last Name', 'Email', 'Mobile Phone Number'];
        const hasRequiredHeaders = requiredHeaders.every(header => 
          headers.some(h => h.trim().toLowerCase() === header.toLowerCase())
        );
        
        if (!hasRequiredHeaders) {
          setImportStatus('error');
          setStatusMessage('CSV file must include First Name, Last Name, Email, and Mobile Phone Number columns');
          return;
        }
        
        // Create preview with first 5 rows
        const previewRows = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          if (lines[i].trim()) {
            const rowData: Record<string, string> = {};
            const values = lines[i].split(',');
            for (let j = 0; j < headers.length; j++) {
              const headerKey = headers[j].trim();
              rowData[headerKey] = values[j]?.trim() || '';
            }
            previewRows.push(rowData);
          }
        }
        setPreviewData(previewRows);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImportStatus('loading');
    setProgress(10);
    
    const formData = new FormData();
    formData.append('csvFile', file, file.name);
    
    // Simulate progress updates (since we can't track actual backend progress)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress < 90 ? newProgress : prev;
      });
    }, 300);
    
    try {
      await importMutation.mutateAsync(formData);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="shadow-none border-0 pt-0">
      <CardContent className="pt-0">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4 
            ${isDragging ? 'border-[#4299E1] bg-[#4299E1]/10' : 'border-gray-300'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            {file ? file.name : 'Drag and drop a CSV file here, or click to browse'}
          </p>
          <p className="text-xs text-gray-500">
            Supported format: CSV with columns for First Name, Last Name, Email, and Mobile Phone Number
          </p>
        </div>

        {importStatus === 'loading' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Importing members...</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {importStatus === 'success' && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Import Successful</AlertTitle>
            <AlertDescription className="text-green-700 text-sm">
              {statusMessage}
            </AlertDescription>
          </Alert>
        )}

        {importStatus === 'error' && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Import Failed</AlertTitle>
            <AlertDescription className="text-red-700 text-sm">
              {statusMessage || 'An error occurred during the import.'}
            </AlertDescription>
          </Alert>
        )}

        {previewData && previewData.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Preview of first 5 records:</h3>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(previewData[0]).map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-gray-600">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value: any, i) => (
                        <td key={i} className="px-3 py-2 text-gray-800">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={!file || importStatus === 'loading'}
            className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
          >
            {importStatus === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Import Members
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CsvImporter;