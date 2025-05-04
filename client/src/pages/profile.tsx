import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Camera, ImageIcon, Key, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/layout/PageLayout";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateUserSchema } from "@shared/schema";

// Create a profile-specific schema based on updateUserSchema
const profileSchema = z.object({
  churchName: z.string().nullable().optional(),
  role: z.string().optional(),
  emailNotificationsEnabled: z.boolean().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Password change schema with validation
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const Profile = () => {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "password"
  
  // Set up profile form with default values
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      churchName: user?.churchName || "",
      role: user?.role || "",
      emailNotificationsEnabled: user?.emailNotificationsEnabled || false,
    },
  });
  
  // Set up password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => {
      return apiRequest('/api/profile', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update your profile',
        variant: 'destructive',
      });
    },
  });
  
  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile picture updated',
        description: 'Your profile picture has been uploaded successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsUploading(false);
    },
    onError: () => {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile picture. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });
  
  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    uploadAvatarMutation.mutate(file);
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Handle profile form submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const response = await apiRequest('/api/profile/password', 'POST', data);
      return response.json();
    },
    onSuccess: (data: { success: boolean, message: string }) => {
      toast({
        title: 'Success',
        description: data.message || 'Your password has been updated successfully',
      });
      // Reset the form after successful password change
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update your password',
        variant: 'destructive',
      });
    },
  });
  
  // Handle password form submission
  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };
  
  // Show loading state if auth is still loading
  if (isAuthLoading) {
    return (
      <PageLayout title="Profile" subtitle="Your account information">
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Profile" subtitle="Your account information">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account Profile</CardTitle>
            <CardDescription>
              Manage your account preferences and settings
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Profile Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 bg-[#69ad4c]">
                  {user?.profileImageUrl ? (
                    <AvatarImage src={user.profileImageUrl} alt={user.username || "User"} />
                  ) : (
                    <AvatarFallback className="text-xl">
                      {user?.role === "ADMIN" ? "A" : "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {/* Hidden file input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                />
                
                {/* Upload button overlay */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="absolute bottom-0 right-0 rounded-full bg-white border border-gray-200 p-1.5 shadow-sm hover:bg-gray-50 text-gray-700"
                  onClick={triggerFileInput}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-semibold">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username || "User"}
                </h3>
                <p className="text-gray-500">{user?.email || "No email provided"}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {user?.role === "ADMIN" ? "Administrator" : "Usher"}
                  </span>
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
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
            
            {/* Tabs for Profile and Password Change */}
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 border-2 border-gray-200 p-1.5 rounded-lg shadow-sm">
                <TabsTrigger 
                  value="profile" 
                  onClick={() => setActiveTab("profile")}
                  className={`font-bold text-sm py-2.5 border-r border-gray-200 ${activeTab === "profile" ? "bg-[#69ad4c] text-white shadow-md" : ""}`}
                >
                  Profile Information
                </TabsTrigger>
                <TabsTrigger 
                  value="password" 
                  onClick={() => setActiveTab("password")}
                  className={`font-bold text-sm py-2.5 ${activeTab === "password" ? "bg-[#69ad4c] text-white shadow-md" : ""}`}
                >
                  Change Password
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={user?.firstName || ""} 
                        disabled
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={user?.lastName || ""} 
                        disabled
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user?.email || ""} 
                        disabled
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input 
                        id="role" 
                        value={user?.role === "ADMIN" ? "Administrator" : "Usher"} 
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 text-sm text-muted-foreground">
                    <p>This information is managed by your Replit account. To update these details, please edit your Replit profile.</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="password" className="space-y-6">
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input 
                        id="currentPassword" 
                        type="password"
                        placeholder="Enter your current password" 
                        {...passwordForm.register("currentPassword")}
                      />
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-sm text-red-500 mt-1">
                          {passwordForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input 
                        id="newPassword" 
                        type="password"
                        placeholder="Enter your new password" 
                        {...passwordForm.register("newPassword")}
                      />
                      {passwordForm.formState.errors.newPassword && (
                        <p className="text-sm text-red-500 mt-1">
                          {passwordForm.formState.errors.newPassword.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Password must be at least 8 characters and include uppercase, lowercase, and numbers.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password"
                        placeholder="Confirm your new password" 
                        {...passwordForm.register("confirmPassword")}
                      />
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500 mt-1">
                          {passwordForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="bg-[#69ad4c] hover:bg-[#588f3f]"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Profile;