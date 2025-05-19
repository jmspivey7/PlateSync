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
import { Loader2, Save, Upload, Camera, ImageIcon, Key, Lock, User, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/layout/PageLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define Zod schemas for validation
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  churchName: z.string().optional(),
  role: z.string().optional(),
  emailNotificationsEnabled: z.boolean().default(false),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Define form value types
type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const Profile = () => {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "password"
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Set up profile form with default values
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
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
    mutationFn: async (data: ProfileFormValues) => {
      // Log the data being sent
      console.log('Updating profile with data:', data);
      
      // Make the API request
      const response = await apiRequest<{success: boolean, message: string}>('/api/profile', 'POST', data);
      
      // Return the response data
      return response;
    },
    onSuccess: async (data) => {
      console.log('Profile update successful:', data);
      
      // Show success toast before navigation
      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully',
      });
      
      // Instead of trying to update the React Query cache,
      // navigate to login-local then immediately back to refresh everything
      // This forces a complete authentication refresh which is most reliable
      window.location.href = "/login-local?redirectTo=" + encodeURIComponent(window.location.pathname);
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      
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
      
      try {
        await apiRequest('/api/profile/avatar', 'POST', formData);
        
        // Invalidate user query to refresh the avatar
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        toast({
          title: 'Success',
          description: 'Your profile picture has been updated',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to upload profile picture',
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
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size should be less than 5MB',
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
      return apiRequest('/api/profile/password', 'POST', data);
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
      <PageLayout title="Profile" subtitle="View and manage your account information." icon={<User className="h-6 w-6 text-[#69ad4c]" />}>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#69ad4c]"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Profile" subtitle="View and manage your account information." icon={<User className="h-6 w-6 text-[#69ad4c]" />}>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            {/* Profile header with avatar */}
            <div className="flex flex-col md:flex-row items-center mb-6 gap-4">
              <div>
                <Avatar className="w-24 h-24 border-2 border-[#69ad4c]">
                  {user?.profileImageUrl ? (
                    <AvatarImage src={user.profileImageUrl} alt="Profile" />
                  ) : (
                    <AvatarFallback className="bg-[#69ad4c] text-white text-xl">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName[0]}${user.lastName[0]}`
                        : user?.username?.[0] || "U"}
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
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username || "User"}
                </h3>
                <p className="text-muted-foreground">
                  {user?.isMasterAdmin ? "Master Admin" : user?.role === "ADMIN" ? "Administrator" : "Usher"}
                </p>
                
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
            
            {/* Tabs for Profile and Password Change */}
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 p-1.5 shadow-sm border border-gray-200 rounded-md">
                <TabsTrigger 
                  value="profile" 
                  onClick={() => setActiveTab("profile")}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#69ad4c] hover:bg-[#69ad4c]/10 transition-colors duration-200 font-bold text-sm py-2.5"
                >
                  Profile Information
                </TabsTrigger>
                <TabsTrigger 
                  value="password" 
                  onClick={() => setActiveTab("password")}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#69ad4c] hover:bg-[#69ad4c]/10 transition-colors duration-200 font-bold text-sm py-2.5"
                >
                  Change Password
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-6">
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="font-bold">First Name:</Label>
                      <Input 
                        id="firstName" 
                        {...profileForm.register("firstName")}
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-red-500 text-sm">{profileForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="font-bold">Last Name:</Label>
                      <Input 
                        id="lastName" 
                        {...profileForm.register("lastName")}
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-red-500 text-sm">{profileForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-bold">Email:</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user?.email || ""} 
                        disabled
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role" className="font-bold">Role:</Label>
                      <Input 
                        id="role" 
                        value={user?.isMasterAdmin ? "Master Admin" : user?.role === "ADMIN" ? "Administrator" : "Usher"} 
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="bg-[#69ad4c] hover:bg-[#5c9941]"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="password" className="space-y-6">
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="font-bold">Current Password:</Label>
                      <div className="relative">
                        <Input 
                          id="currentPassword" 
                          type={showCurrentPassword ? "text" : "password"}
                          className="pr-10 [text-security:disc]"
                          placeholder="••••••••"
                          {...passwordForm.register("currentPassword")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-sm text-red-500 mt-1">
                          {passwordForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="font-bold">New Password:</Label>
                      <div className="relative">
                        <Input 
                          id="newPassword" 
                          type={showNewPassword ? "text" : "password"}
                          className="pr-10 [text-security:disc]"
                          placeholder="••••••••"
                          {...passwordForm.register("newPassword")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          tabIndex={-1}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
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
                      <Label htmlFor="confirmPassword" className="font-bold">Confirm New Password:</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword" 
                          type={showConfirmPassword ? "text" : "password"}
                          className="pr-10 [text-security:disc]"
                          placeholder="••••••••"
                          {...passwordForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
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
                      className="bg-[#69ad4c] hover:bg-[#588f3f] text-white"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
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