import assert from "node:assert/strict";
import { test } from "node:test";
import { journalJson, slimIssue } from "../vendor/horizon-site/hub.js";

const roadmap = { items: [{ id: "rendering-speed", title: "Faster rendering", status: "planned", links: ["#19239"] }], areas: [], journal: [] };
const NOW = "2026-11-22T10:00:00.000Z";

const pull = (over: Record<string, unknown>) =>
  slimIssue({
    number: 1,
    title: "Fix a thing",
    state: "closed",
    html_url: "https://github.com/horizon-rust/horizon/pull/1",
    user: { login: "someone" },
    labels: [],
    pull_request: { merged_at: "2026-11-21T09:00:00Z" },
    ...over,
  });

const merges = (list: ReturnType<typeof slimIssue>[]) => journalJson([], list, roadmap, NOW).entries.filter((e: { kind: string }) => e.kind === "merge");

test("a merge entry names its author, who merged it and its labels", () => {
  const raw = {
    number: 19239,
    title: "Draw far chunks faster",
    html_url: "https://github.com/horizon-rust/horizon/pull/19239",
    user: { login: "DrDth" },
    labels: [{ name: "perf" }, { name: "rendering" }, { name: "size: L" }],
    pull_request: { merged_at: "2026-11-21T09:00:00Z" },
    state: "closed",
  };
  const list = [slimIssue(raw)];
  list[0].mergedBy = "kacpherek";
  const [entry] = merges(list);
  assert.equal(entry.author, "DrDth");
  assert.equal(entry.merged_by, "kacpherek");
  assert.deepEqual(entry.labels, ["perf", "rendering", "size: L"]);
  assert.equal(entry.id, "pr-19239");
  assert.equal(entry.item, "rendering-speed");
});

test("merged_by is null when GitHub's list did not say, and the feed stays version 2", () => {
  const out = journalJson([], [pull({})], roadmap, NOW);
  assert.equal(out.version, 2);
  assert.equal(out.entries[0].merged_by, null);
  assert.equal(out.entries[0].author, "someone");
  assert.deepEqual(out.entries[0].labels, []);
});

test("merged_by comes through from a pull request read", () => {
  const [entry] = merges([pull({ merged_by: { login: "kacpherek" } })]);
  assert.equal(entry.merged_by, "kacpherek");
});

test("the feed keeps its latest 300 entries", () => {
  const list = Array.from({ length: 320 }, (_, i) =>
    pull({ number: i + 1, pull_request: { merged_at: new Date(Date.UTC(2026, 10, 1) + i * 60_000).toISOString() } }),
  );
  const found = merges(list);
  assert.equal(found.length, 300);
  assert.equal(found[0].number, 320);
});
