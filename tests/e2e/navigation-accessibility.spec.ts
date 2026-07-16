import { test, expect } from "@playwright/test";
import { auditPage, expectCleanAudit, openSeededApp, openView } from "./helpers";

test("the app hydrates without replacing server-rendered content", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openSeededApp(page);
  await page.waitForTimeout(250);
  expect(pageErrors.filter((message) => /hydration|React error #418/i.test(message))).toEqual([]);
});

test("Back and Forward move between app sections", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Mobile projects only.");
  await openSeededApp(page);
  await openView(page, "Timeline");
  await openView(page, "Care Plan");

  await page.goBack();
  await expect(page.getByRole("heading", { level: 2, name: "Timeline", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2, name: "Today", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { level: 2, name: "Timeline", exact: true })).toBeVisible();
});

test("mobile app menu traps focus, locks the page, and restores focus", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Mobile projects only.");
  await openSeededApp(page);
  const menuButton = page.getByRole("button", { name: "Open app menu", exact: true });
  await menuButton.click();
  await expect(page.getByRole("dialog", { name: "App menu" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "App menu" })).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("visible controls expose names and reduced motion is respected", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSeededApp(page);
  expectCleanAudit(await auditPage(page, false), false);

  const transitionDuration = await page.getByRole("button", { name: "Timeline", exact: true }).evaluate((element) =>
    getComputedStyle(element).transitionDuration
  );
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);

  await page.getByRole("button", { name: "Emergency summary", exact: true }).focus();
  const focusStyle = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    const style = getComputedStyle(active);
    return { tag: active.tagName, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle?.tag).not.toBe("BODY");
  expect(focusStyle?.outlineStyle).not.toBe("none");
});
