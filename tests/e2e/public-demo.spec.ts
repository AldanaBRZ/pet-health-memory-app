import { expect, test } from "@playwright/test";
import { auditPage, expectCleanAudit, openView } from "./helpers";

async function appStorageKeys(page: import("@playwright/test").Page) {
  return page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith("pet-health-memory")));
}

test("public demo opens without an account, resets, and never persists household data", async ({ page }, testInfo) => {
  const summaryRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/summary") summaryRequests.push(request.url());
  });

  await page.goto("/demo");
  const app = page.locator('[data-app-ready="true"][data-demo-mode="public"]');
  await expect(app).toBeVisible();
  await expect(page.getByRole("heading", { name: "Milo", exact: true })).toBeVisible();
  await expect(page.getByText("Public demo", { exact: true })).toBeVisible();
  await expect(page.getByText("Temporary demo · not saved", { exact: true })).toBeVisible();
  expect(await appStorageKeys(page)).toEqual([]);

  await page.getByRole("button", { name: "Open app menu", exact: true }).click();
  await page.getByRole("dialog", { name: "App menu", exact: true }).getByRole("combobox").selectOption("pet-juno");
  await expect(page.getByRole("heading", { name: "Juno", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Milo", exact: true })).toBeVisible();
  expect(await appStorageKeys(page)).toEqual([]);

  await openView(page, "More");
  await openView(page, "What changed", "Recent");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Demo summaries are generated locally. No data was sent to an AI provider.", { exact: true })).toBeVisible();
  expect(summaryRequests).toEqual([]);

  expectCleanAudit(await auditPage(page, testInfo.project.name.startsWith("mobile-")), testInfo.project.name.startsWith("mobile-"));

  await page.getByRole("button", { name: "Exit demo / Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-demo-mode="public"]')).toHaveCount(0);
});

test("public demo disables profile, symptom, and document uploads", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator('[data-demo-mode="public"]')).toBeVisible();

  await openView(page, "More");
  await openView(page, "Profile");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByText("Profile photo uploads are disabled in the public demo.", { exact: false })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await openView(page, "Symptom log", "Symptoms");
  await expect(page.getByText("Photo uploads are disabled in the public demo.", { exact: false })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await openView(page, "Documents");
  await expect(page.getByText("Uploads are disabled here", { exact: false })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
