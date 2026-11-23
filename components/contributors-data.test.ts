import assert from "node:assert/strict";
import { test } from "node:test";
import { readContributorsFile } from "./contributors-data.ts";

const fresh = {
  generatedAt: "2026-11-23T07:39:58Z",
  rule: "merged-prs-with-coauthors+reviews/3",
  contributors: [{ login: "player", avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4", prs: 17, reviews: 3 }],
};

test("a cold read gets current counts from the raw data branch without using the contents API", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://raw.githubusercontent.com/horizon-rust/horizon-site/contributors-data/contributors.json");
    return Response.json(fresh);
  });
  const contents = t.mock.fn(async () => new Response("", { status: 429 }));

  assert.deepEqual(await readContributorsFile(contents), fresh);
  assert.equal(contents.mock.callCount(), 0);
});

test("the contents API supplies current counts when the raw file cannot be read", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  const contents = async (path: string) => {
    assert.equal(path, "/repos/horizon-rust/horizon-site/contents/contributors.json?ref=contributors-data");
    return Response.json({ content: Buffer.from(JSON.stringify(fresh)).toString("base64") });
  };

  assert.deepEqual(await readContributorsFile(contents), fresh);
});

test("invalid data from both sources is rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ contributors: [] }));
  const contents = async () => Response.json({ content: Buffer.from("not JSON").toString("base64") });

  await assert.rejects(() => readContributorsFile(contents), AggregateError);
});
