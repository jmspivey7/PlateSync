import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface GlobalAdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export function useGlobalAdminAuth() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<GlobalAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('globalAdminToken');
        
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Decode token to get user data (basic check)
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          // Check if token is expired
          const currentTime = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < currentTime) {
            console.log('Global admin token expired, logging out');
            localStorage.removeItem('globalAdminToken');
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Token is valid, set user
          setUser({
            id: payload.id,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role
          });
        } catch (e) {
          console.error('Error decoding token:', e);
          localStorage.removeItem('globalAdminToken');
          setUser(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Authentication error'));
        console.error('Global admin auth error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/global-admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Login failed',
          description: data.message || 'Invalid credentials',
          variant: 'destructive',
        });
        return false;
      }

      // Save token and user data
      localStorage.setItem('globalAdminToken', data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      toast({
        title: 'Login error',
        description: 'An error occurred during login. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('globalAdminToken');
    setUser(null);
    setLocation('/global-admin/login');
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
  };
}