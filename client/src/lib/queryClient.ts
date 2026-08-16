import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { BASE_URL } from "../ENDPOINTS";

/* ===============================
   Error handler
================================ */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/* ===============================
   REST requests (POST, PUT, DELETE)
================================ */
export async function apiRequest(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: data
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/* ===============================
   React Query GET fetcher
================================ */
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn =
  <T>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    // queryKey[0] should be the path, e.g. "/api/products" or "/api/products/123"
    const path = queryKey[0] as string;
    const url = `${BASE_URL}${path}`;

    const res = await fetch(url, { credentials: "include" });

    if (res.status === 401 && on401 === "returnNull") {
      return null as T;
    }

    await throwIfResNotOk(res);
    return res.json() as Promise<T>;
  };

/* ===============================
   Query Client
================================ */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});