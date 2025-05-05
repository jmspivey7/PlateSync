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
  
  // Parse parameters based on type
  if (typeof methodOrConfig === 'string') {
    method = methodOrConfig;
    body = bodyParam;
  } else if (typeof methodOrConfig === 'object' && methodOrConfig !== null) {
    method = methodOrConfig.method || "GET";
    body = methodOrConfig.body;
  }
  
  const isFormData = body instanceof FormData;
  
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

  await throwIfResNotOk(res);
  
  // For 204 No Content responses, return an empty object
  if (res.status === 204) {
    return {} as T;
  }
  
  // Otherwise parse and return JSON
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T>(options: { on401: UnauthorizedBehavior }): QueryFunction<T> => {
  return async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (options.on401 === "returnNull") {
        return null as any;
      }
    }

    await throwIfResNotOk(res);
    
    // For 204 No Content responses, return an empty object
    if (res.status === 204) {
      return {} as T;
    }
    
    return await res.json();
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