import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, CheckCircle2, AlertCircle, Loader2, Users, Clock, Link2Off } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CsvImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [showPlanningCenterWarning, setShowPlanningCenterWarning] = useState(false);
  const [showImportModeDialog, setShowImportModeDialog] = useState(false);
  const [existingMemberCount, setExistingMemberCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replaceAllMode, setReplaceAllMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch CSV import stats
  const { data: importStats } = useQuery({
    queryKey: ['/api/csv-import/stats'],
    refetchOnWindowFocus: false,
  });

  // Fetch Planning Center connection status
  const { data: planningCenterStatus } = useQuery({
    queryKey: ['/api/planning-center/status'],
    refetchOnWindowFocus: false,
  });

  const isPlanningCenterConnected = planningCenterStatus?.connected;

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        // Add the replaceAll parameter to the form data
        formData.append('replaceAll', replaceAllMode.toString());
        
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

  const processFile = async (selectedFile: File) => {
    // Check if Planning Center is connected before processing CSV
    if (isPlanningCenterConnected) {
      setShowPlanningCenterWarning(true);
      return;
    }

    // Check if there are existing members
    try {
      const membersResponse = await fetch('/api/members', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        
        if (Array.isArray(membersData) && membersData.length > 0) {
          setExistingMemberCount(membersData.length);
          setSelectedFile(selectedFile);
          setShowImportModeDialog(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking existing members:', error);
    }

    // If no existing members, proceed directly with import
    performImport(selectedFile, false);
  };

  const performImport = (selectedFile: File, replaceAll: boolean) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setImportStatus('error');
      setStatusMessage('Please upload a valid CSV file');
      return;
    }

    setFile(selectedFile);
    setImportStatus('idle');
    setStatusMessage(null);
    setProgress(0);
    
    // Store the replaceAll setting to use in the actual import
    setReplaceAllMode(replaceAll);
    
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
    
    // Double-check Planning Center connection before import
    if (isPlanningCenterConnected) {
      setShowPlanningCenterWarning(true);
      return;
    }
    
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
    // Check if Planning Center is connected before allowing file selection
    if (isPlanningCenterConnected) {
      setShowPlanningCenterWarning(true);
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <>
      <Card className="shadow-none border-0 pt-0">
      <CardContent className="pt-0 pb-3">
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

        <div className="flex flex-col items-center">
          <Button
            onClick={handleImport}
            disabled={!file || importStatus === 'loading'}
            className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white px-6 mb-2"
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
          
          {/* Last import timestamp display */}
          <div className="text-xs text-gray-500 flex items-center mt-2">
            <Clock className="h-3 w-3 mr-1" />
            {importStats?.lastImportDate ? (
              <>Last import: {format(new Date(importStats.lastImportDate), 'MMM d, yyyy') + ' at ' + format(new Date(importStats.lastImportDate), 'h:mm a')}</>
            ) : (
              <>Last import: Never</>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Planning Center Warning Dialog */}
    <Dialog open={showPlanningCenterWarning} onOpenChange={setShowPlanningCenterWarning}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Planning Center Already Connected
          </DialogTitle>
          <DialogDescription>
            Your church is currently connected to Planning Center for member management. 
            You cannot use both Planning Center and CSV file imports simultaneously.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Link2Off className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">To proceed with CSV import:</p>
                <p>You must first disconnect from Planning Center in the Planning Center Integration section below.</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowPlanningCenterWarning(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowPlanningCenterWarning(false);
              // Optionally scroll to Planning Center section
              const planningCenterSection = document.querySelector('[data-planning-center-section]');
              if (planningCenterSection) {
                planningCenterSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Go to Planning Center Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Import Mode Choice Dialog */}
    <Dialog open={showImportModeDialog} onOpenChange={setShowImportModeDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose Import Method</DialogTitle>
          <DialogDescription>
            You currently have {existingMemberCount} members in your database. How would you like to handle the CSV import?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={() => {
                setShowImportModeDialog(false);
                if (selectedFile) {
                  performImport(selectedFile, false);
                }
              }}
              className="w-full p-4 h-auto flex flex-col items-start bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200"
              variant="outline"
            >
              <div className="font-medium">Add to Existing Members</div>
              <div className="text-sm text-blue-700">Keep your current {existingMemberCount} members and add new ones from the CSV file</div>
            </Button>
            
            <Button 
              onClick={() => {
                setShowImportModeDialog(false);
                if (selectedFile) {
                  performImport(selectedFile, true);
                }
              }}
              className="w-full p-4 h-auto flex flex-col items-start bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200"
              variant="outline"
            >
              <div className="font-medium">Merge and Update Members</div>
              <div className="text-sm text-orange-700">Keep all {existingMemberCount} current members and update any matches with CSV data</div>
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowImportModeDialog(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CsvImporter;