/**
 * Utility functions for global admin authentication
 */

// Save the global admin token to localStorage
export const saveGlobalAdminToken = (token: string): void => {
  localStorage.setItem('globalAdminToken', token);
};

// Get the global admin token from localStorage
export const getGlobalAdminToken = (): string | null => {
  return localStorage.getItem('globalAdminToken');
};

// Clear the global admin token from localStorage
export const clearGlobalAdminToken = (): void => {
  localStorage.removeItem('globalAdminToken');
};

// Check if the global admin is authenticated
export const isGlobalAdminAuthenticated = (): boolean => {
  const token = getGlobalAdminToken();
  return !!token;
};

// Create fetch wrapper with authentication headers for global admin API calls
export const globalAdminFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getGlobalAdminToken();
  
  if (!token) {
    throw new Error('Not authenticated as global admin');
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // If the response is 401 (Unauthorized), the token might be expired
  if (response.status === 401) {
    clearGlobalAdminToken();
    throw new Error('Session expired. Please log in again.');
  }
  
  return response;
};