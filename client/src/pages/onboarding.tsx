"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle, ArrowRight, ChevronsRight, X, Plus, ChevronLeft, Mail } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import plateSyncLogo from "../assets/platesync-logo.png";

// Onboarding Steps
enum OnboardingStep {
  CREATING_ACCOUNT = 0,
  VERIFY_EMAIL = 1,
  UPLOAD_LOGO = 2,
  SERVICE_OPTIONS = 3,
  COMPLETE = 4
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
  
  // Service options states
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [newServiceOption, setNewServiceOption] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  
  // Email verification states
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
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
              setCurrentStep(OnboardingStep.VERIFY_EMAIL);
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
  
  // Auto-send verification code when on verification step
  useEffect(() => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL && !verificationSent && email && churchId) {
      sendVerificationCode();
    }
  }, [currentStep, verificationSent, email, churchId]);
  
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
    if (!logoFile) {
      toast({
        title: "No logo selected",
        description: "Please select a logo to upload",
        variant: "destructive"
      });
      return;
    }
    
    // Get userId from localStorage if available (might have been saved during verification)
    const storedUserId = localStorage.getItem('userId');
    
    // Use either churchId from params or userId from verification
    const idToUse = churchId || storedUserId;
    
    if (!idToUse) {
      toast({
        title: "Missing church ID",
        description: "Church ID is required for logo upload",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('churchId', idToUse);
      
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
  
  // Send email verification code
  const sendVerificationCode = async () => {
    if (!email || !churchId) {
      toast({
        title: "Error",
        description: "Missing email or church ID",
        variant: "destructive"
      });
      return;
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          churchId,
          churchName
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification code');
      }
      
      setVerificationSent(true);
      
      toast({
        title: "Verification code sent",
        description: `A 6-digit code has been sent to ${email}`,
        variant: "default"
      });
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Failed to send verification code");
      
      toast({
        title: "Failed to send verification code",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Verify the email verification code
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6 || !email || !churchId) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          email,
          churchId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }
      
      // Successful verification means user is now authenticated
      const data = await response.json();
      
      // Store the userId in localStorage if provided in the response
      if (data.userId) {
        localStorage.setItem('userId', data.userId);
        console.log('User ID stored during verification:', data.userId);
        
        // Also store the verified status for this user
        localStorage.setItem('userVerified', 'true');
      }
      
      toast({
        title: "Email verified",
        description: "Your email has been verified successfully",
        variant: "default"
      });
      
      // Move to the next step
      setCurrentStep(OnboardingStep.UPLOAD_LOGO);
      
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Invalid verification code");
      
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      // Cannot skip email verification
      toast({
        title: "Email verification required",
        description: "You must verify your email to continue",
        variant: "destructive"
      });
      return;
    } else if (currentStep === OnboardingStep.UPLOAD_LOGO) {
      setCurrentStep(OnboardingStep.SERVICE_OPTIONS);
    } else if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      setCurrentStep(OnboardingStep.COMPLETE);
    } else {
      // If on last step or otherwise, redirect to login page
      setLocation("/login-local");
    }
  };
  
  // Handle next step
  const handleNextStep = () => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      // For verification step, we need to verify the code
      verifyCode();
    } else if (currentStep === OnboardingStep.UPLOAD_LOGO) {
      setCurrentStep(OnboardingStep.SERVICE_OPTIONS);
    } else if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      setCurrentStep(OnboardingStep.COMPLETE);
    } else if (currentStep === OnboardingStep.COMPLETE) {
      // Redirect to login page after completing onboarding
      setLocation("/login-local");
    }
  };
  
  // Handle back step
  const handleBackStep = () => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      // Cannot go back from email verification
      return;
    } else if (currentStep === OnboardingStep.UPLOAD_LOGO) {
      // Cannot go back to verification once verified
      return;
    } else if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      setCurrentStep(OnboardingStep.UPLOAD_LOGO);
    } else if (currentStep === OnboardingStep.COMPLETE) {
      setCurrentStep(OnboardingStep.SERVICE_OPTIONS);
    }
  };
  
  // Handle adding a new service option
  const handleAddServiceOption = () => {
    if (!newServiceOption.trim()) {
      toast({
        title: "Invalid service name",
        description: "Please enter a valid service name",
        variant: "destructive"
      });
      return;
    }
    
    if (serviceOptions.includes(newServiceOption.trim())) {
      toast({
        title: "Duplicate service",
        description: "This service option already exists",
        variant: "destructive"
      });
      return;
    }
    
    setIsAddingService(true);
    
    try {
      // During onboarding, we'll just add to local state
      // These options will be properly saved when the user logs in
      const trimmedOption = newServiceOption.trim();
      setServiceOptions([...serviceOptions, trimmedOption]);
      setNewServiceOption('');
      
      toast({
        title: "Service option added",
        description: `"${trimmedOption}" has been added`,
        variant: "default"
      });
      
      // Store in localStorage to persist during onboarding
      const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
      localStorage.setItem('onboardingServiceOptions', JSON.stringify([...storedOptions, trimmedOption]));
      
    } catch (error) {
      toast({
        title: "Failed to add service option",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAddingService(false);
    }
  };
  
  // Handle removing a service option
  const handleRemoveServiceOption = (option: string) => {
    try {
      // Update local state
      setServiceOptions(serviceOptions.filter(service => service !== option));
      
      // Update localStorage
      const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
      localStorage.setItem(
        'onboardingServiceOptions', 
        JSON.stringify(storedOptions.filter((item: string) => item !== option))
      );
      
      toast({
        title: "Service option removed",
        description: `"${option}" has been removed`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Failed to remove service option",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Load existing service options when entering the service options step
  useEffect(() => {
    if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      // Load from localStorage during onboarding
      try {
        const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
        setServiceOptions(storedOptions);
      } catch (error) {
        console.error('Error loading service options from localStorage:', error);
        // Default options if there's an error loading from localStorage
        setServiceOptions([]);
      }
    }
  }, [currentStep]);
  
  // Update progress bar based on current step
  useEffect(() => {
    switch (currentStep) {
      case OnboardingStep.CREATING_ACCOUNT:
        // Progress is handled by the animation
        break;
      case OnboardingStep.VERIFY_EMAIL:
        setProgress(20);
        break;
      case OnboardingStep.UPLOAD_LOGO:
        setProgress(40);
        break;
      case OnboardingStep.SERVICE_OPTIONS:
        setProgress(60);
        break;
      case OnboardingStep.COMPLETE:
        setProgress(100);
        break;
    }
  }, [currentStep]);
  
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
      
      case OnboardingStep.VERIFY_EMAIL:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Verify Your Email</h2>
              <div className="text-sm text-gray-500">Step 1 of 4</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              We've sent a 6-digit verification code to <span className="font-medium">{email}</span>. 
              Please enter the code below to continue with your account setup.
            </p>
            
            <div className="flex flex-col items-center space-y-8 py-6">
              <div className="bg-gray-50 p-8 rounded-lg w-full max-w-md flex flex-col items-center space-y-6">
                <Mail className="h-12 w-12 text-[#69ad4c] mb-2" />
                
                <InputOTP 
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isVerifying}
                  className="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                
                {verificationError && (
                  <p className="text-sm text-red-500 mt-2">{verificationError}</p>
                )}
                
                <div className="flex items-center justify-center space-x-4 mt-4 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isVerifying || !email}
                    onClick={sendVerificationCode}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    disabled={isVerifying || verificationCode.length !== 6}
                    onClick={verifyCode}
                    className="w-full bg-[#69ad4c] hover:bg-[#5a9440]"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 max-w-md text-center">
                Didn't receive a code? Check your spam folder or click the resend button above.
                If you continue to have issues, please contact support.
              </p>
            </div>
          </div>
        );
        
      case OnboardingStep.UPLOAD_LOGO:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 2: Upload Your Church Logo</h2>
              <div className="text-sm text-gray-500">Step 2 of 4</div>
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
      
      case OnboardingStep.SERVICE_OPTIONS:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 3: Add Service Options</h2>
              <div className="text-sm text-gray-500">Step 3 of 4</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Set up your service types for donation tracking. Add options like "Sunday Morning", "Wednesday Night", "Special Events", etc.
              <br />
              <span className="text-sm italic">You can add or modify these options later in Settings.</span>
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Enter a service name (e.g., Sunday Morning)"
                  value={newServiceOption}
                  onChange={(e) => setNewServiceOption(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAddingService) {
                      e.preventDefault();
                      handleAddServiceOption();
                    }
                  }}
                />
                
                <Button
                  onClick={handleAddServiceOption}
                  disabled={isAddingService}
                  className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white"
                >
                  {isAddingService ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="ml-2">Add</span>
                </Button>
              </div>
              
              {/* List of service options */}
              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Your Service Options</h3>
                  <span className="text-sm text-gray-500">{serviceOptions.length} options</span>
                </div>
                
                {serviceOptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <p>No service options added yet</p>
                    <p className="text-sm">Add some options above to get started</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {serviceOptions.map((option, index) => (
                      <li 
                        key={index} 
                        className="flex justify-between items-center p-3 bg-white rounded-md border border-gray-200"
                      >
                        <span>{option}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServiceOption(option)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Suggested services */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested services:</h3>
                <div className="flex flex-wrap gap-2">
                  {["Sunday Morning", "Sunday Evening", "Wednesday Night", "Special Event"].map(
                    (suggestion) => {
                      // Only show if not already added
                      if (serviceOptions.includes(suggestion)) return null;
                      
                      return (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewServiceOption(suggestion);
                          }}
                          className="bg-gray-100"
                        >
                          {suggestion}
                        </Button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-8">
              <div className="space-x-4">
                <Button
                  variant="outline"
                  onClick={handleBackStep}
                  className="space-x-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSkip}
                >
                  Skip for Now
                </Button>
              </div>
              
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleNextStep}
              >
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      
      case OnboardingStep.COMPLETE:
        return (
          <div className="flex flex-col items-center justify-center space-y-6 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-[#69ad4c]" />
            </div>
            <h2 className="text-2xl font-bold">Setup Complete!</h2>
            <p className="text-gray-600 max-w-md">
              Congratulations! Your PlateSync account is ready to use. Click the button below to sign in and start managing your donations.
            </p>
            <Button
              variant="default"
              className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white mt-4"
              onClick={handleNextStep}
            >
              Go to Sign In <ChevronsRight className="ml-2 h-4 w-4" />
            </Button>
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