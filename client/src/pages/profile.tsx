import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User } from "lucide-react";
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

const Profile = () => {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Set up form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      churchName: user?.churchName || "",
      role: user?.role || "",
      emailNotificationsEnabled: user?.emailNotificationsEnabled || false,
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => {
      return apiRequest('/api/profile', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
  
  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
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
            <div className="space-y-6">
              {/* Profile Avatar & Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="h-24 w-24 bg-[#69ad4c]">
                  {user?.profileImageUrl ? (
                    <AvatarImage src={user.profileImageUrl} alt={user.username || "User"} />
                  ) : (
                    <AvatarFallback className="text-xl">
                      {user?.role === "ADMIN" ? "A" : "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                
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
                </div>
              </div>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={user?.username || ""} 
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
                    <Label htmlFor="church-name">Church Name</Label>
                    <Input 
                      id="church-name" 
                      placeholder="Enter your church name" 
                      {...form.register("churchName")}
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
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="bg-[#69ad4c] hover:bg-[#588f3f]"
                    disabled={updateProfileMutation.isPending}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Profile;