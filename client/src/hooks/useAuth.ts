import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type LoginCredentials = {
  username: string;
  password: string;
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
    staleTime: 10000, // 10 seconds
    refetchInterval: false,
    refetchOnWindowFocus: true,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Debug user data issues
  useEffect(() => {
    if (error) {
      console.error("Error fetching user data:", error);
    }
  }, [error]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        const response = await apiRequest<any>("/api/login-local", "POST", credentials);
        return response;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData) => {
      // Clear and refetch user query after successful login
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Force navigate to dashboard after successful login
      console.log("Login successful, redirecting to dashboard", userData);
      
      // Use setTimeout to ensure that the query client has time to invalidate and refetch
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
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
      // Clear all cached data
      queryClient.clear();
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

  return {
    user,
    isLoading,
    refetch,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN" || user?.role === "ACCOUNT_OWNER",
    isStandard: user?.role === "STANDARD" || !user?.role,
    isAccountOwner: user?.role === "ACCOUNT_OWNER" || (user?.role === "ADMIN" && user?.isAccountOwner === true),
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginStatus: {
      isLoading: loginMutation.isPending,
      error: loginMutation.error,
    },
  };
}