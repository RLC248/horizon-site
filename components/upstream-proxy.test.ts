import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp } from "./upstream-proxy.ts";

const request = (headers: Record<string, string>) => new Request("https://playhorizon.dev/api/mods/x", { headers });

test("Cloudflare's visitor address wins over the edge's", () => {
  assert.equal(clientIp(request({ "cf-connecting-ip": "203.0.113.9", "x-real-ip": "172.70.1.2" })), "203.0.113.9");
});

test("without Cloudflare, the edge's X-Real-IP, then the first X-Forwarded-For hop", () => {
  assert.equal(clientIp(request({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4" })), "198.51.100.7");
  assert.equal(clientIp(request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(request({})), "");
});
