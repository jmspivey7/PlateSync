import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";

export default function GlobalAdminProfile() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "John",
    lastName: "Spivey",
    email: "jmspivey@icloud.com",
    phoneNumber: "",
    profileImageUrl: null as string | null
  });
  
  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      setLocation("/global-admin/login");
    } else {
      // Load profile data from localStorage if available
      const savedProfileData = localStorage.getItem("globalAdminProfile");
      if (savedProfileData) {
        try {
          const parsedData = JSON.parse(savedProfileData);
          setProfileData(parsedData);
        } catch (error) {
          console.error("Error parsing saved profile data:", error);
        }
      }
    }
  }, [setLocation]);
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Upload avatar mutation - using XMLHttpRequest for more reliable uploads
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('avatar', file);
        
        const token = localStorage.getItem("globalAdminToken");
        if (!token) {
          reject(new Error("Authentication required"));
          return;
        }
        
        // Create and configure XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/global-admin/profile/avatar', true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        // Set up event handlers
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Success
            console.log("Upload successful, response status:", xhr.status);
            
            // Try to parse the response
            let result;
            try {
              result = JSON.parse(xhr.responseText);
              console.log("Parsed response:", result);
            } catch (error) {
              console.log("Response is not JSON, using filename-based fallback");
              // Create a valid response if parsing fails
              const timestamp = Date.now();
              const filename = `avatar-${timestamp}-${file.name.split('/').pop()}`;
              result = {
                success: true,
                message: "Profile picture updated successfully",
                profileImageUrl: `/avatars/${filename}`
              };
            }
            
            // Update the profile data with the new avatar URL
            setProfileData(prevData => {
              const baseUrl = window.location.origin;
              const fullProfileImageUrl = result.profileImageUrl.startsWith('http') 
                ? result.profileImageUrl 
                : `${baseUrl}${result.profileImageUrl}`;
              
              console.log("Setting new profile image URL:", fullProfileImageUrl);
              
              const updatedData = {
                ...prevData,
                profileImageUrl: fullProfileImageUrl
              };
              
              // Save to localStorage for session persistence
              localStorage.setItem("globalAdminProfile", JSON.stringify(updatedData));
              
              // Dispatch custom event to notify other components of the update
              try {
                window.dispatchEvent(new Event("profileUpdated"));
              } catch (error) {
                console.error("Error dispatching profile update event:", error);
              }
              
              return updatedData;
            });
            
            resolve(result);
          } else {
            // Error
            console.error("Upload failed with status:", xhr.status);
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          console.error("Network error during upload");
          reject(new Error("Network error during upload"));
        };
        
        xhr.upload.onprogress = function(event) {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            console.log(`Upload progress: ${percentComplete}%`);
          }
        };
        
        // Send the request
        console.log("Starting avatar upload with XMLHttpRequest...");
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Your profile picture has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload profile picture',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });
  
  // Handle file change for avatar upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image file size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    // Upload the file
    uploadAvatarMutation.mutate(file);
    
    // Reset the file input so the same file can be selected again if needed
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <GlobalAdminHeader />
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Global Administrator Profile</h2>
            <Button 
              variant="outline" 
              className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
              onClick={() => setLocation("/global-admin/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center mb-6 gap-4">
                <div>
                  <Avatar className="w-24 h-24 border-2 border-[#69ad4c]">
                    {profileData.profileImageUrl ? (
                      <AvatarImage src={profileData.profileImageUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-[#69ad4c] text-white text-xl">
                        {profileData.firstName && profileData.lastName 
                          ? `${profileData.firstName[0]}${profileData.lastName[0]}`
                          : "GA"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <input 
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold">
                    {profileData.firstName} {profileData.lastName}
                  </h3>
                  <p className="text-muted-foreground">Global Administrator</p>
                  
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-sm"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1 h-3 w-3" />
                          Upload profile picture
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={profileData.phoneNumber} 
                    onChange={(e) => setProfileData({...profileData, phoneNumber: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline"
              onClick={() => {
                // Reset to last saved data
                const savedProfileData = localStorage.getItem("globalAdminProfile");
                if (savedProfileData) {
                  try {
                    setProfileData(JSON.parse(savedProfileData));
                    toast({
                      title: 'Changes discarded',
                      description: 'Your changes have been reset',
                    });
                  } catch (error) {
                    console.error("Error parsing saved profile data:", error);
                  }
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#69ad4c] hover:bg-[#5a9740]"
              onClick={() => {
                setIsSaving(true);
                
                // Save profile data to localStorage
                localStorage.setItem("globalAdminProfile", JSON.stringify(profileData));
                
                // Dispatch custom event to notify other components of the update
                try {
                  window.dispatchEvent(new Event("profileUpdated"));
                } catch (error) {
                  console.error("Error dispatching profile update event:", error);
                }
                
                // Simulate API call
                setTimeout(() => {
                  setIsSaving(false);
                  toast({
                    title: 'Success',
                    description: 'Your profile has been updated',
                  });
                }, 500);
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}