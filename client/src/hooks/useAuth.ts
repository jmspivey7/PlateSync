import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";

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
    refetch 
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30000, // 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        return await apiRequest("POST", "/api/login", credentials);
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
      await apiRequest("POST", "/api/logout");
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