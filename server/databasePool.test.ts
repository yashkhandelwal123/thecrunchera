import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createDatabasePool, logDatabaseError } from "./databasePool";

// Exercise the real Neon pool's idle-client eviction with a local fake client.
// No database, orders or credentials are used.
class FakeClient extends EventEmitter {
  static created: FakeClient[] = [];
  _queryable = true;
  _ending = false;
  ended = false;
  constructor() { super(); FakeClient.created.push(this); }
  connect(cb: (error?: Error) => void) { queueMicrotask(() => cb()); }
  end() { this.ended = true; }
  ref() {}
  unref() {}
}
test("idle database termination evicts client, logs safely and allows reconnection", async () => {
  const pool = createDatabasePool({});
  // Neon overrides the constructor option; inject the test client before acquisition.
  (pool as any).Client = FakeClient;
  const logs: unknown[][] = [];
  const original = console.error;
  console.error = (...args) => { logs.push(args); };
  try {
    const client = await pool.connect();
    client.release();
    const failed = FakeClient.created.at(-1)!;
    const error = Object.assign(new Error("secret-password"), { code: "57P01", client: { connectionString: "secret-url" } });
    assert.doesNotThrow(() => failed.emit("error", error));
    assert.equal(failed.ended, true);
    assert.equal(pool.totalCount, 0);
    const replacement = await pool.connect();
    assert.notEqual(replacement, client);
    replacement.release();
    assert.match(JSON.stringify(logs), /57P01/);
    assert.doesNotMatch(JSON.stringify(logs), /secret-password|secret-url/);
    logDatabaseError({code:"password=secret"}, "session");
    assert.doesNotMatch(JSON.stringify(logs), /password=secret/);
  } finally {
    console.error = original;
    await pool.end();
  }
});
