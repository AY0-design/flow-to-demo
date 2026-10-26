// Finds a Chromium/Chrome binary for Playwright and Remotion.
// Order: FLOW_BROWSER env -> Playwright's browser cache -> undefined (tools download their own).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function findChrome({ headlessShell = false } = {}) {
  if (process.env.FLOW_BROWSER && fs.existsSync(process.env.FLOW_BROWSER)) return process.env.FLOW_BROWSER;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), "AppData", "Local", "ms-playwright"),
  ].filter(Boolean);
  const want = headlessShell ? ["chromium_headless_shell-", "chromium-"] : ["chromium-", "chromium_headless_shell-"];
  const bins = [
    "chrome-linux64/chrome", "chrome-linux/chrome", "chrome-headless-shell-linux64/chrome-headless-shell",
    "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-headless-shell-mac-arm64/chrome-headless-shell", "chrome-headless-shell-mac-x64/chrome-headless-shell",
    "chrome-win/chrome.exe", "chrome-win64/chrome.exe", "chrome-headless-shell-win64/chrome-headless-shell.exe",
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const prefix of want) {
      const dirs = fs.readdirSync(root).filter((d) => d.startsWith(prefix)).sort().reverse();
      for (const d of dirs) for (const b of bins) {
        const p = path.join(root, d, b);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return undefined;
}
