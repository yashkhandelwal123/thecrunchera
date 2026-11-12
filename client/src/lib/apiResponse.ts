/** Keep response diagnostics without exposing proxy HTML or raw parser errors to shoppers. */
export class ApiResponseError extends Error {
  constructor(message: string, public status: number, public contentType: string, public reason: string) { super(message); }
}
export async function readApiJson<T = any>(response: Response): Promise<T> {
  const type = response.headers.get("content-type") || "";
  const fail = (reason: string): never => {
    throw new ApiResponseError(`The store couldn't load a valid response (${response.status}). Please retry. If this continues, contact support.`, response.status, type, reason);
  };
  const text = await response.text();
  if (!text.trim()) return fail("empty-body");
  if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(type)) return fail("non-json-content-type");
  let data: any;
  try { data = JSON.parse(text); } catch { return fail("malformed-json"); }
  if (!response.ok) {
    const fields = data?.error?.fieldErrors;
    const fieldMessage = fields && typeof fields === "object" ? Object.values(fields).flat().filter(value => typeof value === "string").join(" ") : "";
    const message = fieldMessage || (typeof data?.error === "string" ? data.error : typeof data?.message === "string" ? data.message : `The store is temporarily unavailable (${response.status}). Please retry.`);
    throw new ApiResponseError(message, response.status, type, "http-error");
  }
  return data as T;
}
export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try { return await fetch(input, init); }
  catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Couldn't connect to the store. Check your connection and retry.");
  }
}
