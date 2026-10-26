#!/usr/bin/env node
// Parses a Figma URL into the identifiers the Figma MCP tools need.
// Usage: node parse-figma-url.mjs "<url>"   → prints JSON
const raw = process.argv[2];
if (!raw) {
  console.error('usage: parse-figma-url.mjs "<figma url>"');
  process.exit(2);
}
let u;
try {
  u = new URL(raw.trim());
} catch {
  console.log(JSON.stringify({ ok: false, error: "not a URL" }));
  process.exit(1);
}
const parts = u.pathname.split("/").filter(Boolean);
const type = parts[0]; // design | file | proto | board | slides | make
let fileKey = parts[1];
let branchKey = null;
if (parts[2] === "branch" && parts[3]) {
  branchKey = parts[3];
  fileKey = parts[3]; // MCP tools take the branch key as fileKey
}
const nodeParam = u.searchParams.get("node-id") ?? u.searchParams.get("starting-point-node-id");
const nodeId = nodeParam ? decodeURIComponent(nodeParam).replace("-", ":") : null;
const out = {
  ok: !!fileKey && u.hostname.endsWith("figma.com"),
  type,
  fileKey,
  branchKey,
  nodeId,
  supported: ["design", "file", "proto"].includes(type),
  note:
    type === "proto"
      ? "Prototype link: the node-id/starting-point is a flow start; prototype reactions exist for this file."
      : !nodeId
        ? "No node-id: list pages with get_metadata (no nodeId) and ask which page/section holds the flow."
        : ["board", "slides", "make"].includes(type)
          ? `"${type}" files aren't design files — ask for the Figma Design file link.`
          : undefined,
};
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
