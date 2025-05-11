"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle, ArrowRight, ChevronsRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import plateSyncLogo from "../assets/platesync-logo.png";

// Onboarding Steps
enum OnboardingStep {
  CREATING_ACCOUNT = 0,
  UPLOAD_LOGO = 1,
  // We'll add more steps later
}

interface OnboardingParams {
  churchId?: string;
  churchName?: string;
  email?: string;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.CREATING_ACCOUNT);
  const [progress, setProgress] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Get parameters from URL query
  const params = new URLSearchParams(window.location.search);
  const churchId = params.get('churchId') || undefined;
  const churchName = params.get('churchName') || 'Your Church';
  const email = params.get('email') || undefined;
  
  // Simulate account creation process with a timer
  useEffect(() => {
    if (currentStep === OnboardingStep.CREATING_ACCOUNT) {
      const timer = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 4;
          if (newProgress >= 100) {
            clearInterval(timer);
            // Move to next step after a small delay
            setTimeout(() => {
              setCurrentStep(OnboardingStep.UPLOAD_LOGO);
            }, 500);
            return 100;
          }
          return newProgress;
        });
      }, 200); // Update progress every 200ms for about 5 seconds total
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [currentStep]);
  
  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPEG, PNG, etc.)",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          setLogoPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle logo upload
  const handleLogoUpload = async () => {
    if (!logoFile || !churchId) {
      toast({
        title: "No logo selected",
        description: "Please select a logo to upload",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('churchId', churchId);
      
      // Send to server
      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }
      
      setUploadSuccess(true);
      
      toast({
        title: "Logo uploaded successfully",
        description: "Your church logo has been saved. Please click Next to continue.",
        variant: "default"
      });
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    // For now, redirect to login page
    setLocation("/login-local");
  };
  
  // Handle next step
  const handleNextStep = () => {
    // For now, we only have the logo upload step
    // In the future, we'll navigate to the next step
    // Current implementation redirects to login page
    setLocation("/login-local");
  };
  
  // Render different content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.CREATING_ACCOUNT:
        return (
          <div className="flex flex-col items-center justify-center space-y-6 p-8 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-[#69ad4c]" />
            <h2 className="text-2xl font-bold">Hold tight while we create your Church organization</h2>
            <Progress value={progress} className="w-full max-w-md" />
            <p className="text-gray-500">Setting up your account...</p>
          </div>
        );
        
      case OnboardingStep.UPLOAD_LOGO:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 1: Upload Your Church Logo</h2>
              <div className="text-sm text-gray-500">Step 1 of 4</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Upload your church logo to personalize your PlateSync experience. This logo will appear on donation receipts and reports.
              <br />
              <span className="text-sm italic">You can skip this step now and add your logo later in Settings.</span>
            </p>
            
            <div className="flex flex-col items-center space-y-6 bg-gray-50 p-8 rounded-lg border border-dashed border-gray-300">
              {logoPreview ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="max-w-[300px] max-h-[150px] object-contain rounded"
                  />
                  <Button 
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      setUploadSuccess(false);
                    }}
                  >
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-white p-6 rounded-full mb-4">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Drag and drop your logo here, or click to browse</p>
                  <p className="text-gray-400 text-sm mt-2">Supports: JPEG, PNG, GIF (Max: 5MB)</p>
                </div>
              )}
              
              <label className={`relative ${logoPreview ? 'hidden' : ''}`}>
                <Button
                  type="button"
                  variant={logoPreview ? "outline" : "default"}
                  className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white"
                >
                  Browse Files
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip for Now
              </Button>
              
              <div className="space-x-4">
                {logoFile && (
                  <Button
                    variant="default"
                    className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white"
                    onClick={handleLogoUpload}
                    disabled={isUploading || uploadSuccess}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : uploadSuccess ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      <>Save Logo</>
                    )}
                  </Button>
                )}
                
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleNextStep}
                >
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown step</div>;
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl border shadow-lg">
        <CardHeader className="py-6 border-b bg-gray-50">
          <div className="flex items-center justify-center">
            <img 
              src={plateSyncLogo} 
              alt="PlateSync Logo" 
              className="h-[5.25rem]"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}