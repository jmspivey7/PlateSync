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

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response>;
export async function apiRequest<T = any>(
  url: string,
  method?: string,
  body?: any,
  headers?: Record<string, string>
): Promise<T>;
export async function apiRequest<T = any>(
  methodOrUrl: string,
  urlOrMethod?: string,
  bodyOrHeaders?: any,
  headersOrUndefined?: Record<string, string>
): Promise<T | Response> {
  // Determine if the first argument is a method or URL
  const isFirstArgMethod = ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(methodOrUrl.toUpperCase());
  
  // Set up variables based on the calling pattern
  const method = isFirstArgMethod ? methodOrUrl : (urlOrMethod || "GET");
  const url = isFirstArgMethod ? urlOrMethod as string : methodOrUrl;
  const body = isFirstArgMethod ? bodyOrHeaders : urlOrMethod === "GET" ? undefined : bodyOrHeaders;
  const headers = isFirstArgMethod ? headersOrUndefined : bodyOrHeaders && typeof bodyOrHeaders === "object" && !Array.isArray(bodyOrHeaders) ? bodyOrHeaders : undefined;
  
  const isFormData = body instanceof FormData;
  
  const res = await fetch(url, {
    method,
    // Don't set Content-Type when using FormData - the browser will set it automatically with the correct boundary
    headers: {
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    // Don't stringify FormData objects
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return raw response if requested in the first signature
  if (isFirstArgMethod) {
    return res as unknown as T;
  }
  
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
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (res.status === 401) {
        if (options.on401 === "returnNull") {
          return null as any;
        } else {
          // Redirect to login
          window.location.href = "/login";
          return null as any;
        }
      }

      await throwIfResNotOk(res);
      
      // For 204 No Content responses, return an empty object
      if (res.status === 204) {
        return {} as T;
      }
      
      return await res.json();
    } catch (error) {
      console.error("Query error:", error);
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