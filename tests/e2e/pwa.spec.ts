import { test, expect } from "@playwright/test";
import { openSeededApp } from "./helpers";

test("production app shell reopens offline without caching API traffic", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "PWA cache lifecycle runs once in Chromium.");
  await openSeededApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const cacheState = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      entries.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return { names, entries };
  });
  expect(cacheState.names.some((name) => name.startsWith("pet-health-memory-shell-"))).toBe(true);
  expect(cacheState.names.some((name) => name.startsWith("pet-health-memory-static-"))).toBe(true);
  expect(cacheState.entries).toContain("/offline");
  expect(cacheState.entries.some((path) => path.startsWith("/_next/static/"))).toBe(true);
  expect(cacheState.entries.some((path) => path.startsWith("/api/"))).toBe(false);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Milo", exact: true })).toBeVisible();
  await page.goto("/missing-while-offline", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "You are offline", exact: true })).toBeVisible();
  await context.setOffline(false);
});

test("manifest describes an installable standalone app", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Manifest contract runs once.");
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ sizes: "192x192" }), expect.objectContaining({ sizes: "512x512" })]));
});
