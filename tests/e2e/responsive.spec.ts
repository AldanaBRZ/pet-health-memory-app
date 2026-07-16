import { test, expect } from "@playwright/test";
import { auditPage, expectCleanAudit, openSeededApp, openView, viewportWidths } from "./helpers";

const primaryViews = [
  ["Today", "Today"],
  ["Timeline", "Timeline"],
  ["Care Plan", "Care Plan"],
  ["Trends", "Trends"],
  ["Emergency", "Emergency"],
  ["More", "More"]
] as const;

const secondaryViews = [
  ["Profile", "Profile"],
  ["Medication tracker", "Meds"],
  ["Symptom log", "Symptoms"],
  ["Documents", "Documents"],
  ["Costs", "Costs"],
  ["Longevity", "Longevity"],
  ["Vet visit mode", "Vet Visit Mode"],
  ["What changed", "Recent"]
] as const;

test.describe("responsive viewport matrix", () => {
  for (const width of viewportWidths) {
    test(`has no page overflow at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "The explicit matrix runs once in Chromium.");
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
      await openSeededApp(page);

      for (const [button, headingName] of primaryViews) {
        const heading = await openView(page, button, headingName);
        await expect
          .poll(async () => (await heading.boundingBox())?.y ?? 999, { message: `${headingName} should open near the top of the viewport` })
          .toBeLessThanOrEqual(180);
        expectCleanAudit(await auditPage(page, width <= 430), width <= 430);
      }

      for (const [button, headingName] of secondaryViews) {
        const heading = await openView(page, button, headingName);
        await expect
          .poll(async () => (await heading.boundingBox())?.y ?? 999, { message: `${headingName} should open near the top of the viewport` })
          .toBeLessThanOrEqual(180);
        expectCleanAudit(await auditPage(page, width <= 430), width <= 430);
      }
    });
  }
});

test("phone projects render their native device profiles cleanly", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Mobile projects only.");
  await openSeededApp(page);
  expectCleanAudit(await auditPage(page, true), true);
  await openView(page, "More");
  await openView(page, "Costs");
  expectCleanAudit(await auditPage(page, true), true);
});
