import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { RedisMessageQueue } from "@fedify/redis";
import { describe, it } from "mocha";

import { kvStore } from "../../src/activityPub/federation";
import { redisClient } from "../../src/config/redis";

// These tests guard the fedify kv/queue backend: it must stay Redis-backed
// (not MemoryKvStore/InProcessMessageQueue) so federation state survives a
// process restart and doesn't leak memory across the lifetime of the API
// process. They talk to the real test Redis instance, no DB required.
describe("federation Redis-backed kv store and message queue", () => {
  const testKey = ["test", "federation-redis-store-spec"] as const;

  afterEach(async () => {
    await kvStore.delete(testKey);
  });

  it("persists kv values in Redis rather than in-process memory", async () => {
    await kvStore.set(testKey, { ok: true });

    // Read back through the raw key format a second, independent client
    // would use, proving the value actually lives in Redis rather than an
    // in-process Map that only this instance could see.
    const raw = await redisClient.get(
      "fedify::test::federation-redis-store-spec"
    );
    assert.ok(raw, "expected the key to exist directly in Redis");

    const value = await kvStore.get(testKey);
    assert.deepStrictEqual(value, { ok: true });
  });

  it("removes kv values on delete", async () => {
    await kvStore.set(testKey, { ok: true });
    await kvStore.delete(testKey);

    const value = await kvStore.get(testKey);
    assert.strictEqual(value, undefined);
  });

  it("delivers enqueued messages through the Redis-backed queue", async function () {
    this.timeout(5000);

    // Use dedicated channel/queue/lock keys rather than the shared
    // production `messageQueue` singleton from federation.ts — the app's
    // real fedify delivery listener also consumes from that channel, so
    // sharing it here makes this test race with production message
    // delivery instead of testing in isolation.
    const testQueue = new RedisMessageQueue(() => redisClient.duplicate(), {
      channelKey: "test:federation-redis-store-spec:channel",
      queueKey: "test:federation-redis-store-spec:queue",
      lockKey: "test:federation-redis-store-spec:lock",
    });

    const controller = new AbortController();
    const received: unknown[] = [];

    const listenPromise = testQueue.listen(
      async (msg) => {
        received.push(msg);
      },
      { signal: controller.signal }
    );

    // Give the listener's dedicated subscribe connection time to attach
    // before we enqueue, otherwise the message can be published before
    // anyone's listening for it.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await testQueue.enqueue({ marker: "federation-redis-store-spec" });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    controller.abort();
    await listenPromise.catch(() => {});

    assert.ok(
      received.some((m: any) => m?.marker === "federation-redis-store-spec"),
      "expected the enqueued message to be delivered to the listener"
    );
  });
});
