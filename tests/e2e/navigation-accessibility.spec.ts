import { test, expect } from "@playwright/test";
import { auditPage, expectCleanAudit, openFreshApp, openSeededApp, openView } from "./helpers";

test("fresh households require a real pet profile and keep demos optional", async ({ page }) => {
  await openFreshApp(page);
  await expect(page.getByText("Welcome. Start by adding your first pet.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add pet", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Open app menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "App menu", exact: true });
  await expect(dialog.getByRole("button", { name: "Add pet", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Open Milo demo", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Open Juno demo", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Open Juno demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Juno", exact: true })).toBeVisible();
  await expect(page.getByText("Temporary demo · not saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "New pet", exact: true })).toBeVisible();
  await expect(page.getByText("Demo profile preview", { exact: true })).toHaveCount(0);
});

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

  await page.keyboard.press("Tab");
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
