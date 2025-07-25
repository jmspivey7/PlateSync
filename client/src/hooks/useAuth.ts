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
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  // Handle successful or failed user data fetch
  useEffect(() => {
    if (user) {
      // Save user data to localStorage when API call succeeds
      saveUserToLocalStorage(user);
      setLocalUser(user);
    } else if (user === null && !isLoading) {
      // If API returns null (401/unauthorized), clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      setLocalUser(null);
    }
  }, [user, isLoading]);

  // Set up interval to synchronize local user data with React Query cache
  useEffect(() => {
    // Check for updates in localStorage every second
    const intervalId = setInterval(() => {
      const storedUser = getUserFromLocalStorage();
      // Only update state if the stored user is different from current local user
      // This comparison ensures we don't cause unnecessary re-renders
      if (storedUser && JSON.stringify(storedUser) !== JSON.stringify(localUser)) {
        console.log("Detected user profile change in localStorage, updating local state");
        setLocalUser(storedUser);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [localUser]);

  // Handle authentication errors - if 401, clear localStorage and redirect
  useEffect(() => {
    if (error) {
      console.error("Error fetching user data:", error);
      
      // Check if it's a 401 error (unauthorized)
      if (error.message && error.message.includes('401')) {
        console.log("Detected 401 error - clearing localStorage and redirecting to login");
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        setLocalUser(null);
        queryClient.clear();
        
        // Redirect to login page
        window.location.href = "/login-local";
      }
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
      try {
        await apiRequest<any>("/api/logout", "POST");
      } catch (error) {
        // If logout fails (e.g., session already destroyed), that's okay
        // We'll still clear local data and redirect
        console.log("Logout API call failed, but proceeding with local cleanup:", error);
      }
      return;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      
      // Force reload to clear any other cached data
      window.location.href = "/login-local";
    },
    onError: () => {
      // Even if logout API fails, clear local data and redirect
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      
      console.log("Logout failed but clearing local data anyway");
      window.location.href = "/login-local";
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