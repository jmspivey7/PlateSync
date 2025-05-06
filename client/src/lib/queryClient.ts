import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON first (most API errors will be JSON)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        const message = data.message || res.statusText;
        throw new Error(`${res.status}: ${message}`);
      } else {
        // If not JSON, get the text
        const text = await res.text();
        console.error('Non-JSON error response:', text);
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (parseError) {
      // If parsing failed, just throw with status text
      console.error('Error parsing response:', parseError);
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

// Define request config type
type RequestConfig = {
  method?: string;
  body?: any;
  returnRaw?: boolean;
};

// Function overloads for better type checking
export async function apiRequest<T = any>(url: string): Promise<T>;
export async function apiRequest<T = any>(url: string, config: RequestConfig): Promise<T>;
export async function apiRequest<T = any>(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: any): Promise<T>;

// Implementation
export async function apiRequest<T = any>(
  url: string,
  methodOrConfig?: string | RequestConfig,
  bodyParam?: any
): Promise<T> {
  let method = "GET";
  let body = undefined;
  let returnRaw = false;
  
  // Parse parameters based on type
  if (typeof methodOrConfig === 'string') {
    method = methodOrConfig;
    body = bodyParam;
  } else if (typeof methodOrConfig === 'object' && methodOrConfig !== null) {
    method = methodOrConfig.method || "GET";
    body = methodOrConfig.body;
    returnRaw = methodOrConfig.returnRaw || false;
  }
  
  const isFormData = body instanceof FormData;
  
  try {
    const res = await fetch(url, {
      method,
      // Don't set Content-Type when using FormData - the browser will set it automatically with the correct boundary
      headers: {
        ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      },
      // Don't stringify FormData objects
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      credentials: "include",
    });

    // For file uploads like logo, we might get a 200 OK but with empty response
    // In that case, we should just return an empty object without trying to parse JSON
    if (url.includes('/logo') && res.ok) {
      console.log('Logo upload successful');
      return { success: true } as unknown as T;
    }

    await throwIfResNotOk(res);
    
    // For 204 No Content responses, return an empty object
    if (res.status === 204) {
      return {} as T;
    }
    
    // If returnRaw is true, return the response object
    if (returnRaw) {
      return res as unknown as T;
    }
    
    // Otherwise parse and return JSON
    try {
      return await res.json();
    } catch (jsonError) {
      console.warn(`Failed to parse JSON response from ${url}:`, jsonError);
      // Return success object if response was successful but not JSON
      if (res.ok) {
        return { success: true } as unknown as T;
      }
      throw jsonError;
    }
  } catch (error) {
    console.error(`API request error for ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T>(options: { on401: UnauthorizedBehavior } = { on401: "throw" }): QueryFunction<T> => {
  return async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (res.status === 401) {
        if (options.on401 === "returnNull") {
          return null as any;
        } else {
          throw new Error("Unauthorized: Please sign in to continue");
        }
      }

      await throwIfResNotOk(res);
      
      // For 204 No Content responses, return an empty object
      if (res.status === 204) {
        return {} as T;
      }
      
      try {
        const data = await res.json();
        return data as T;
      } catch (jsonError) {
        console.warn(`Failed to parse JSON from ${queryKey[0]}:`, jsonError);
        // Return empty object if parsing fails instead of throwing an error
        return {} as T;
      }
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      // Special error handling for authentication - don't break the dashboard if auth fails
      if (queryKey[0] === '/api/auth/user') {
        console.warn('Auth error - returning null user to prevent UI crash');
        return null as any;
      }
      throw error;
    }
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});