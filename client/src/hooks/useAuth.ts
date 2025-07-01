import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type LoginCredentials = {
  username: string;
  password: string;
};

// Cache user data in local storage
const LOCAL_STORAGE_USER_KEY = "platesync_user_profile";

// Save user data to local storage
const saveUserToLocalStorage = (userData: User) => {
  if (!userData) return;
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userData));
};

// Get user data from local storage
const getUserFromLocalStorage = (): User | null => {
  const userData = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (!userData) return null;
  
  try {
    return JSON.parse(userData) as User;
  } catch (e) {
    console.error("Failed to parse user data from localStorage:", e);
    return null;
  }
};

export function useAuth() {
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState<User | null>(getUserFromLocalStorage());
  
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
    onSuccess: (data) => {
      if (data) {
        // Save user data to localStorage when API call succeeds
        saveUserToLocalStorage(data);
        setLocalUser(data);
      }
    }
  });

  // Update local state when API data changes
  useEffect(() => {
    if (user) {
      saveUserToLocalStorage(user);
      setLocalUser(user);
    }
  }, [user]);

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
        const response = await fetch("/api/login-local", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Login failed");
        }
        
        return await response.json();
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
      // Login error is handled and displayed in the UI component
      console.error("Login error in useAuth hook:", error.message);
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

  // Merge the API data with localStorage data to provide the most up-to-date information
  const effectiveUser = localUser || user;
  
  return {
    user: effectiveUser,
    isLoading,
    refetch,
    isAuthenticated: !!effectiveUser,
    isAdmin: effectiveUser?.role === "ADMIN" || effectiveUser?.role === "ACCOUNT_OWNER",
    isStandard: effectiveUser?.role === "STANDARD" || !effectiveUser?.role,
    isAccountOwner: effectiveUser?.role === "ACCOUNT_OWNER" || (effectiveUser?.role === "ADMIN" && effectiveUser?.isAccountOwner === true),
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginStatus: {
      isLoading: loginMutation.isPending,
      error: loginMutation.error,
    },
    // Expose a method to update profile in localStorage
    updateLocalProfile: (updatedData: Partial<User>) => {
      const currentUserData = getUserFromLocalStorage();
      if (currentUserData) {
        const updatedUser = { ...currentUserData, ...updatedData };
        saveUserToLocalStorage(updatedUser);
        setLocalUser(updatedUser);
      }
    }
  };
}