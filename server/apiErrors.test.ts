import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { apiErrorHandler, apiNotFound } from "./apiErrors";
import { readApiJson, fetchApi, ApiResponseError } from "../client/src/lib/apiResponse";

test("empty, HTML, malformed and denied responses produce actionable errors with diagnostics", async () => {
  for (const [body, type, reason] of [["", "application/json", "empty-body"], ["<html>proxy</html>", "text/html", "non-json-content-type"], ["{", "application/json", "malformed-json"]]) {
    await assert.rejects(readApiJson(new Response(body, {headers:{"content-type":type}})), (error: any) => error instanceof ApiResponseError && error.reason === reason && !error.message.includes("JSON.parse"));
  }
  await assert.rejects(readApiJson(new Response('error code: 1010', {status:403,headers:{"content-type":"text/plain"}})), (error:any) => error.status === 403 && error.reason === "non-json-content-type");
  await assert.rejects(readApiJson(Response.json({error:"Please sign in again"},{status:401})), /Please sign in again/);
  assert.deepEqual(await readApiJson(Response.json({ok:true})), {ok:true});
});

test("connection failure is actionable, aborts remain cancellable", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
    await assert.rejects(fetchApi("http://test.invalid"), /Check your connection/);
    globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
    await assert.rejects(fetchApi("http://test.invalid"), {name:"AbortError"});
  } finally { globalThis.fetch = original; }
});

test("server returns JSON for malformed bodies, unknown API routes and exceptions, then stays available", async () => {
  const app = express(); app.use(express.json());
  app.post("/api/failure", () => { throw new Error("simulated store failure"); });
  app.get("/api/health", (_req,res) => { res.json({ok:true}); });
  app.use("/api", apiNotFound); app.use(apiErrorHandler);
  const server = app.listen(0,"127.0.0.1"); await once(server,"listening");
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    for (const [path,body,status] of [["failure","{",400],["failure","{}",500],["missing","{}",404]] as const) {
      const response = await fetch(url+"/api/"+path,{method:"POST",headers:{"content-type":"application/json"},body});
      assert.equal(response.status,status); assert.match(response.headers.get("content-type")!,/application\/json/);
      assert.equal(typeof (await response.json()).error,"string");
    }
    assert.deepEqual(await (await fetch(url+"/api/health")).json(),{ok:true});
  } finally { await new Promise<void>(resolve => server.close(()=>resolve())); }
});
