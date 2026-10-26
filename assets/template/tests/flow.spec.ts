// Generic journey tests driven entirely by flow.json — no per-project edits needed.
//  1. "demo journey" replays the approved demo script by really clicking/typing,
//     asserting the visible screen after every step and saving a screenshot per screen.
//  2. "interaction: …" checks each wired interaction from the state where the demo reaches it.
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { activeSurface, compileTimeline, expandAction, stateAt } from "../src/flow/engine";
import { flow, presentation } from "../src/flow/load";
import type { DemoStep } from "../src/flow/types";

const pres = { ...presentation, speed: 1 };
const tl = compileTimeline(flow, pres);
fs.mkdirSync("qa/screens", { recursive: true });

type W = { __flow?: { surface: string; busy: boolean; state: { stack: string[] }; api: { run: (a: unknown[]) => Promise<void>; setFlag: (k: string, v: unknown) => void } } };

async function idle(page: Page) {
  await page.waitForFunction(() => {
    const f = (window as unknown as W).__flow;
    return !!f && !f.busy;
  });
  await page.waitForTimeout(60);
}
const surface = (page: Page) => page.evaluate(() => (window as unknown as W).__flow!.surface);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // failed requests are reported with their URL by the response listener below
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(`console.error: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("favicon.ico")) errors.push(`HTTP ${r.status()}: ${r.url()} (missing asset?)`);
  });
  return errors;
}

async function perform(page: Page, step: DemoStep) {
  const s = await surface(page);
  const scope = page.locator(`[data-screen="${s}"]`);
  switch (step.do) {
    case "tap": {
      const el = scope.locator(`[data-flow-id="${step.target}"]`).first();
      await expect(el, `"${step.target}" should exist on "${s}"`).toBeVisible();
      await expect(el, `"${step.target}" should be enabled on "${s}"`).not.toHaveAttribute("aria-disabled", "true");
      await el.click();
      break;
    }
    case "type": {
      const el = scope.locator(`[data-field-id="${step.target}"]`).first();
      await expect(el, `field "${step.target}" should exist on "${s}"`).toBeVisible();
      await el.click();
      await el.pressSequentially(step.text, { delay: 10 });
      break;
    }
    case "scroll": {
      const key = step.screen ?? s;
      await page.evaluate(
        ({ key, to }) => {
          const el = document.querySelector<HTMLElement>(`[data-scroll-id="${key}"]`);
          if (!el) throw new Error(`no <Scroll> for "${key}"`);
          el.scrollTop = to === "end" ? el.scrollHeight : to === "top" ? 0 : (to as number);
        },
        { key, to: step.to },
      );
      break;
    }
    case "set":
      await page.evaluate(({ k, v }) => (window as unknown as W).__flow!.api.setFlag(k, v), { k: step.key, v: step.value });
      break;
    case "action":
      await page.evaluate((a) => (window as unknown as W).__flow!.api.run(a), step.actions as unknown[]);
      break;
    case "wait":
      break;
  }
}

test("demo journey completes and shows the expected screen after every step", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/?embed=1&frame=none");
  await idle(page);
  expect(await surface(page)).toBe(flow.meta.start);
  await expect(page.getByText("Missing screen component")).toHaveCount(0);
  const shot = new Set<string>();
  const snap = async (id: string) => {
    if (shot.has(id)) return;
    shot.add(id);
    await page.locator(".flow-screen").screenshot({ path: `qa/screens/${id}.png`, animations: "disabled" });
  };
  await snap(flow.meta.start);

  for (const info of tl.steps) {
    await test.step(`step ${info.index}: ${info.step.do} ${"target" in info.step ? info.step.target : ""}`, async () => {
      await perform(page, info.step);
      await idle(page);
      // toasts / overlays may still be animating out; wait until the surface settles
      await expect.poll(() => surface(page), { timeout: 5000 }).toBe(info.surfaceAfter);
      await expect(page.getByText("Missing screen component")).toHaveCount(0);
      await page.waitForTimeout(150);
      await snap(info.surfaceAfter);
    });
  }
  expect(errors, errors.join("\n")).toEqual([]);
});

// one test per interaction that the demo path can reach
for (const ix of flow.interactions) {
  // Prefer the moment the demo itself uses this element (fields are filled by then);
  // otherwise the first time the demo reaches the element's screen.
  const surfaceBefore = (j: number) => (j === 0 ? flow.meta.start : tl.steps[j - 1].surfaceAfter);
  const used = tl.steps.findIndex((s, j) => s.step.do === "tap" && s.step.target === ix.element && surfaceBefore(j) === ix.screen);
  const firstVisit = ix.screen === flow.meta.start ? 0 : tl.steps.findIndex((s) => s.surfaceAfter === ix.screen) + 1;
  const at = used >= 0 ? used : firstVisit; // number of demo steps to replay first
  if (at <= 0 && ix.screen !== flow.meta.start) {
    test.skip(`interaction: ${ix.id} (screen not reached by demo — test manually)`, () => {});
    continue;
  }
  test(`interaction: ${ix.id}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/?embed=1&frame=none");
    await idle(page);
    const upto = at - 1;
    for (let i = 0; i <= upto; i++) {
      await perform(page, tl.steps[i].step);
      await idle(page);
      await expect.poll(() => surface(page)).toBe(tl.steps[i].surfaceAfter);
    }
    // expected result from the engine
    const before = upto < 0 ? stateAt(flow, tl, 0) : stateAt(flow, tl, tl.steps[upto].endMs);
    for (const a of ix.actions) for (const o of expandAction(a, before, pres, flow)) o.apply(before, 1);
    const expected = activeSurface({ ...before, overlays: before.overlays.filter((o) => o.p > 0) });

    const el = page.locator(`[data-screen="${ix.screen}"] [data-flow-id="${ix.element}"]`).first();
    await expect(el, `"${ix.element}" should be on "${ix.screen}"`).toBeVisible();
    if ((await el.getAttribute("aria-disabled")) === "true") {
      test.info().annotations.push({ type: "note", description: `${ix.element} disabled at this point in the demo; not clicked` });
      return;
    }
    await el.click();
    await idle(page);
    await expect.poll(() => surface(page), { timeout: 5000 }).toBe(expected);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
