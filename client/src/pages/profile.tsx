import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { updateUserSchema, type User } from "@shared/schema";
import type { z } from "zod";
import PageLayout from "@/components/layout/PageLayout";

type FormValues = z.infer<typeof updateUserSchema>;

const Profile = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      profileImageUrl: user?.profileImageUrl || "",
    },
  });
  
  const { isPending, mutate } = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest(`/api/users/profile`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update profile information",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: FormValues) => {
    mutate(data);
  };
  
  return (
    <PageLayout title="My Profile" subtitle="Manage your personal information">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-gray-200">
                <AvatarImage src={user?.profileImageUrl || ""} />
                <AvatarFallback className="bg-white text-gray-800 font-medium text-lg">
                  {isAdmin ? "A" : "U"}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <CardTitle className="text-xl">
                  {user?.firstName || user?.username} {user?.lastName || ""}
                </CardTitle>
                <CardDescription>
                  Role: {isAdmin ? "Administrator" : "Usher"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    {...form.register("firstName")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    {...form.register("lastName")}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  {...form.register("email")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profileImageUrl">Profile Image URL</Label>
                <Input 
                  id="profileImageUrl"
                  placeholder="https://example.com/profile.jpg"
                  {...form.register("profileImageUrl")}
                />
                <p className="text-sm text-gray-500">
                  Enter a URL to a publicly accessible image.
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isPending} className="bg-[#69ad4c] hover:bg-[#588f3f]">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Profile;