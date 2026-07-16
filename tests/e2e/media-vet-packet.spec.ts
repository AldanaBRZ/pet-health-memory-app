import { test, expect } from "@playwright/test";
import { openSeededApp, openView } from "./helpers";

test("profile photos and vet documents support picker and camera flows", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Mobile projects only.");
  await openSeededApp(page);
  await openView(page, "More");
  await openView(page, "Profile");
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const profileCamera = page.locator('input[type="file"][capture="environment"]');
  await expect(profileCamera).toHaveCount(1);
  await expect(profileCamera).toHaveAttribute("accept", "image/*");

  const profilePicker = page.locator('input[type="file"][accept*="image/jpeg"]');
  await expect(profilePicker).toHaveCount(1);
  await profilePicker.setInputFiles("public/icon-192.png");
  await expect(page.getByRole("img", { name: "Milo profile photo", exact: true })).toBeVisible();

  await openView(page, "Documents");
  const documentCamera = page.locator('input[type="file"][capture="environment"]');
  await expect(documentCamera).toHaveCount(1);
  await expect(documentCamera).toHaveAttribute("accept", "image/*");

  const documentPicker = page.locator('input[type="file"][multiple]');
  await documentPicker.setInputFiles({
    name: "mobility-lab-result.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% test document\n")
  });
  await expect(page.getByRole("heading", { name: "mobility lab result", exact: true })).toBeVisible();
});

test("Vet Packet sharing requires confirmation and print styling is available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload: ShareData) => {
        (window as typeof window & { __sharedVetPacket?: ShareData }).__sharedVetPacket = payload;
      }
    });
  });
  await openSeededApp(page);
  await openView(page, "Emergency");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Share Vet Packet", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __sharedVetPacket?: ShareData }).__sharedVetPacket?.text ?? "")).toContain("Milo Vet Packet");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __sharedVetPacket?: ShareData }).__sharedVetPacket?.text ?? "")).toContain("Not medical advice");

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".no-print").first()).toBeHidden();
  await expect(page.locator(".emergency-sheet")).toHaveCSS("box-shadow", "none");
});
