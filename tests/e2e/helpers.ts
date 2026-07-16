import { expect, type Page } from "@playwright/test";

export const viewportWidths = [320, 360, 390, 430, 768, 1280] as const;

export async function openSeededApp(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).color)).toBe("rgb(23, 33, 49)");
  await expect(page.getByRole("heading", { name: "Milo", exact: true })).toBeVisible();
}

export async function openView(page: Page, buttonName: string, headingName = buttonName) {
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const heading = page.getByRole("heading", { level: 2, name: headingName, exact: true });
  await expect(heading).toBeVisible();
  return heading;
}

export async function auditPage(page: Page, enforceMobileTargets: boolean) {
  return page.evaluate(({ enforceTargets }) => {
    const root = document.documentElement;
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const nameFor = (element: Element) =>
      element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim().slice(0, 80) || element.tagName;

    const targetSelector = 'button:not([disabled]), a[href], label:has(input[type="file"]), label:has(input[type="checkbox"]), label:has(input[type="radio"])';
    const smallTargets = enforceTargets
      ? Array.from(document.querySelectorAll(targetSelector))
          .filter(isVisible)
          .map((element) => ({ element, rect: element.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width < 44 || rect.height < 44)
          .map(({ element, rect }) => ({ name: nameFor(element), width: Math.round(rect.width), height: Math.round(rect.height) }))
      : [];

    const smallFormText = Array.from(
      document.querySelectorAll('input:not([type="file"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]), select, textarea')
    )
      .filter(isVisible)
      .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
      .map((element) => ({ name: nameFor(element), fontSize: getComputedStyle(element).fontSize }));

    const unnamedButtons = Array.from(document.querySelectorAll("button"))
      .filter(isVisible)
      .filter((button) => !button.getAttribute("aria-label") && !button.getAttribute("aria-labelledby") && !button.textContent?.trim())
      .map(nameFor);
    const imagesWithoutAlt = Array.from(document.querySelectorAll("img"))
      .filter(isVisible)
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => image.getAttribute("src") || "image");
    const overflowingElements = Array.from(document.body.querySelectorAll("*"))
      .filter(isVisible)
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.left < -1 || rect.right > root.clientWidth + 1)
      .slice(0, 12)
      .map(({ element, rect }) => ({
        name: nameFor(element),
        tag: element.tagName,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width)
      }));

    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
      smallTargets,
      smallFormText,
      unnamedButtons,
      imagesWithoutAlt,
      overflowingElements
    };
  }, { enforceTargets: enforceMobileTargets });
}

export function expectCleanAudit(audit: Awaited<ReturnType<typeof auditPage>>, mobile: boolean) {
  expect(
    audit.horizontalOverflow,
    `document width ${audit.scrollWidth}px exceeded ${audit.clientWidth}px; overflowing elements: ${JSON.stringify(audit.overflowingElements)}`
  ).toBe(false);
  expect(audit.unnamedButtons, "visible buttons need accessible names").toEqual([]);
  expect(audit.imagesWithoutAlt, "visible images need alt text").toEqual([]);
  if (mobile) {
    expect(audit.smallTargets, "mobile controls need at least a 44 by 44px target").toEqual([]);
    expect(audit.smallFormText, "mobile form controls need 16px text to avoid iOS zoom").toEqual([]);
  }
}
