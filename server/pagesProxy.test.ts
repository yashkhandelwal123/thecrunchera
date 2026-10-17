import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Cloudflare's file-based JavaScript entrypoint has no declaration file.
import { onRequest } from "../functions/api/[[path]].js";
const request = () => new Request("https://preview.example.pages.dev/api/checkout/quote", {method:"POST",headers:{"Content-Type":"application/json",Cookie:"connect.sid=test-session"},body:'{"items":[]}'});
test("Pages rejects missing or recursive backend configuration with JSON", async () => {
  for (const API_ORIGIN of [undefined,"bad","http://api.example.com","https://preview.example.pages.dev","https://api.example.com/api"]) {
    const res = await onRequest({request:request(),env:{API_ORIGIN}});
    assert.equal(res.status,503); assert.equal(typeof (await res.json()).error,"string");
  }
});
test("Pages proxy forwards POST body and session, preserving backend status and cookies", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url:any, init:any) => {
      assert.equal(url.href,"https://api.example.com/api/checkout/quote");
      assert.equal(init.method,"POST"); assert.equal(init.headers.get("cookie"),"connect.sid=test-session");
      assert.equal(await new Response(init.body).text(),'{"items":[]}');
      return Response.json({error:"Please check cart"},{status:400,headers:{"Set-Cookie":"connect.sid=updated; Path=/; HttpOnly; Secure"}});
    };
    const res = await onRequest({request:request(),env:{API_ORIGIN:"https://api.example.com"}});
    assert.equal(res.status,400); assert.match(res.headers.get("set-cookie")!,/connect.sid=updated/);
    assert.deepEqual(await res.json(),{error:"Please check cart"});
  } finally { globalThis.fetch = original; }
});
test("empty 405, HTML, malformed JSON and unreachable origin return actionable JSON", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response(null,{status:405}),new Response("<html>error</html>"),new Response("{",{headers:{"Content-Type":"application/json"}}),null]) {
      globalThis.fetch = async () => {if (!response) throw new Error("offline");return response;};
      const res = await onRequest({request:request(),env:{API_ORIGIN:"https://api.example.com"}});
      assert.equal(res.status,502); assert.equal(typeof (await res.json()).error,"string");
    }
  } finally { globalThis.fetch = original; }
});
