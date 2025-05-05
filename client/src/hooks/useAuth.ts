import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30000, // 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    isUsher: user?.role === "USHER" || !user?.role,
  };
}