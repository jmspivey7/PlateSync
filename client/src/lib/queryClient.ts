import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    returnRaw?: boolean;
  }
): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const method = options?.method || 'GET';
  
  const res = await fetch(url, {
    method,
    // Don't set Content-Type when using FormData - the browser will set it automatically with the correct boundary
    headers: {
      ...(options?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    // Don't stringify FormData objects
    body: options?.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return raw response if requested
  if (options?.returnRaw) {
    return res as unknown as T;
  }
  
  // Otherwise parse and return JSON
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
