import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminAccountDropdown from "@/components/global-admin/GlobalAdminAccountDropdown";
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
  
  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('avatar', file);
      
      try {
        const token = localStorage.getItem("globalAdminToken");
        if (!token) {
          throw new Error("Authentication required");
        }
        
        const response = await fetch('/api/global-admin/profile/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to upload avatar");
        }
        
        const result = await response.json();
        
        // Update profile data with the new avatar URL
        if (result.success) {
          // Update the profile data with the new avatar URL from the server
          setProfileData(prevData => {
            const updatedData = {
              ...prevData,
              profileImageUrl: result.profileImageUrl
            };
            
            // Save to localStorage for persistence
            localStorage.setItem("globalAdminProfile", JSON.stringify(updatedData));
            
            return updatedData;
          });
          
          toast({
            title: 'Success',
            description: 'Your profile picture has been updated',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload profile picture',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
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
    
    // Upload the file
    uploadAvatarMutation.mutate(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex-1">
            <img 
              src="/logo-with-text.png" 
              alt="PlateSync Logo" 
              className="h-10 object-contain" 
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold text-[#69ad4c]">Global Administration</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <GlobalAdminAccountDropdown 
              adminName="John Spivey" 
              adminEmail="jspivey@spiveyco.com" 
            />
          </div>
        </div>
      </header>
      
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