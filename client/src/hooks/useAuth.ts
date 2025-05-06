import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type LoginCredentials = {
  username: string;
  password: string;
};

// Fallback user for development mode
const fallbackUser = {
  id: "40829937",
  username: "jspivey",
  email: "jspivey@spiveyco.com",
  firstName: "John",
  lastName: "Spivey",
  role: "ADMIN",
  churchId: "1",
  churchName: "Redeemer Presbyterian Church",
  churchLogoUrl: "/logos/logo-1746331972517-682990183.png",
  profileImageUrl: "/avatars/avatar-1746332089971-772508694.jpg",
  emailNotificationsEnabled: true,
  donorEmailsEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

export function useAuth() {
  const { toast } = useToast();
  
  // Get the current user data
  const { 
    data: user, 
    isLoading,
    refetch,
    error
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  // Handle authentication errors silently
  useEffect(() => {
    if (error) {
      console.warn("Authentication error:", error);
      // Don't show error toasts for auth issues to avoid spamming the user
    }
  }, [error]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        return await apiRequest<any>("/api/login-local", "POST", credentials);
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate user query to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login successful",
        description: "You have been logged in successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest<any>("/api/logout", "POST");
      return;
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      // Force reload to clear any other cached data
      window.location.href = "/login-local";
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was a problem logging you out. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Use fallback user in development mode if API fails
  let effectiveUser = user;
  if (process.env.NODE_ENV === 'development' && !user) {
    console.warn("Using fallback user data in development mode");
    effectiveUser = fallbackUser as User;
  }

  return {
    user: effectiveUser,
    isLoading,
    refetch,
    isAuthenticated: !!effectiveUser,
    isAdmin: effectiveUser?.role === "ADMIN",
    isUsher: effectiveUser?.role === "USHER" || !effectiveUser?.role,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginStatus: {
      isLoading: loginMutation.isPending,
      error: loginMutation.error,
    },
  };
}