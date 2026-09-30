import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { BASE_URL } from "../ENDPOINTS";

import { fetchApi, readApiJson } from "./apiResponse";

/* ===============================
   REST requests (POST, PUT, DELETE)
================================ */
export async function apiRequest(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetchApi(`${BASE_URL}${path}`, {
    method,
    headers: data
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await readApiJson(res.clone());
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

    const res = await fetchApi(url, { credentials: "include" });

    if (res.status === 401 && on401 === "returnNull") {
      return null as T;
    }

    await readApiJson(res.clone());
    return readApiJson<T>(res);
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
