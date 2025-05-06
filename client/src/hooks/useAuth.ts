import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type LoginCredentials = {
  username: string;
  password: string;
};

// No fallback user - we'll rely on the actual database data

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

  // No fallback user - we'll use the actual user data from the API
  return {
    user,
    isLoading,
    refetch,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    isUsher: user?.role === "USHER" || !user?.role,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginStatus: {
      isLoading: loginMutation.isPending,
      error: loginMutation.error,
    },
  };
}