import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.GALLERY_BASE_URL ?? "http://127.0.0.1:3011";
const projectRoot = process.cwd();
const galleryDir = path.join(projectRoot, "devpost-assets", "gallery");
const tempDir = path.join(projectRoot, "test-results", "devpost-gallery");

await mkdir(galleryDir, { recursive: true });
await mkdir(tempDir, { recursive: true });

async function preparePage(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
  await page.locator('[data-app-ready="true"][data-demo-mode="public"]').waitFor();
  await stabilizePage(page);
  return page;
}

async function prepareInternalDemo(context) {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.getByRole("button", { name: "Open app menu", exact: true }).click();
  await page.getByRole("button", { name: "Open Milo demo", exact: true }).click();
  await page.getByRole("heading", { name: "Milo", exact: true }).waitFor();
  await stabilizePage(page);
  return page;
}

async function stabilizePage(page) {
  await page.addStyleTag({
    content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; scroll-behavior: auto !important; } nextjs-portal { display: none !important; }"
  });
}

async function openView(page, primary, secondary) {
  await page.getByRole("button", { name: primary, exact: true }).click();
  if (secondary) await page.getByRole("button", { name: secondary, exact: true }).click();
  await page.waitForTimeout(120);
}

async function alignTo(page, locator, top = 24) {
  await locator.waitFor({ state: "visible" });
  await page.evaluate(() => {
    document.body.style.paddingBottom = "900px";
  });
  await locator.evaluate((element, targetTop) => {
    const y = window.scrollY + element.getBoundingClientRect().top - targetTop;
    window.scrollTo(0, Math.max(0, y));
  }, top);
  await page.waitForTimeout(180);
}

async function captureDesktop(context, fileName, open, target, top = 24, prepare = preparePage) {
  const page = await prepare(context);
  await open(page);
  await alignTo(page, target(page), top);
  await page.screenshot({ path: path.join(galleryDir, fileName) });
  await page.close();
}

async function captureDesktopTop(context, fileName) {
  const page = await preparePage(context);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(galleryDir, fileName) });
  await page.close();
}

async function captureMobile(browser, fileName, open, target) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 760 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    isMobile: true,
    hasTouch: true
  });
  const page = await preparePage(context);
  await open(page);
  await alignTo(page, target(page), 10);
  await page.screenshot({ path: path.join(tempDir, fileName) });
  await context.close();
}

function dataUrl(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function captureMobileComposite(browser) {
  await captureMobile(
    browser,
    "mobile-today.png",
    async (page) => openView(page, "Today"),
    (page) => page.getByRole("heading", { name: "Today care", exact: true })
  );
  await captureMobile(
    browser,
    "mobile-vet-packet.png",
    async (page) => openView(page, "Emergency"),
    (page) => page.locator(".emergency-sheet")
  );

  const today = dataUrl(await readFile(path.join(tempDir, "mobile-today.png")));
  const packet = dataUrl(await readFile(path.join(tempDir, "mobile-vet-packet.png")));
  const context = await browser.newContext({ viewport: { width: 1278, height: 852 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; width: 1278px; height: 852px; overflow: hidden; background: #f7f5ef; color: #172131; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .accent { height: 8px; background: #245247; }
          main { height: 844px; display: grid; grid-template-columns: 0.82fr 1.18fr; align-items: center; gap: 40px; padding: 54px 60px 52px; }
          .brand { display: flex; align-items: center; gap: 14px; color: #245247; font-size: 18px; font-weight: 750; }
          .mark { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 8px; background: #245247; color: white; font-size: 22px; }
          .eyebrow { margin: 42px 0 14px; color: #b5584c; font-size: 14px; font-weight: 800; text-transform: uppercase; }
          h1 { margin: 0; font-size: 48px; line-height: 1.08; letter-spacing: 0; }
          .lede { margin: 24px 0 0; max-width: 470px; color: #52647a; font-size: 18px; line-height: 1.55; }
          ul { display: grid; gap: 16px; margin: 28px 0 0; padding: 0; list-style: none; font-size: 16px; font-weight: 700; }
          li { display: flex; align-items: center; gap: 12px; }
          li span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; background: #e7f2ee; color: #245247; }
          .phones { display: flex; align-items: center; justify-content: center; gap: 22px; }
          .phone { position: relative; width: 300px; height: 664px; overflow: hidden; border: 10px solid #172131; border-radius: 38px; background: white; box-shadow: 0 22px 44px rgba(23, 33, 49, 0.18); }
          .phone:last-child { transform: translateY(28px); }
          .phone::before { content: ""; position: absolute; z-index: 2; top: 8px; left: 50%; width: 82px; height: 17px; transform: translateX(-50%); border-radius: 20px; background: #172131; }
          .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
          .caption { position: absolute; z-index: 3; right: 14px; bottom: 14px; left: 14px; border-radius: 8px; background: rgba(255, 255, 255, 0.94); padding: 9px 12px; color: #245247; font-size: 12px; font-weight: 800; text-align: center; box-shadow: 0 4px 18px rgba(23, 33, 49, 0.12); }
        </style>
      </head>
      <body>
        <div class="accent"></div>
        <main>
          <section>
            <div class="brand"><span class="mark">C</span>Continuum: Pet Health Memory</div>
            <p class="eyebrow">Mobile PWA</p>
            <h1>Care details ready when the vet asks.</h1>
            <p class="lede">A calm, installable experience for following today&apos;s care and carrying a useful Vet Packet wherever care happens.</p>
            <ul>
              <li><span>✓</span>Complete today&apos;s care checklist</li>
              <li><span>✓</span>Review recent symptoms and changes</li>
              <li><span>✓</span>Print, save, or share a Vet Packet</li>
            </ul>
          </section>
          <section class="phones">
            <div class="phone"><img src="${today}" alt="Today care on mobile" /><div class="caption">Today care</div></div>
            <div class="phone"><img src="${packet}" alt="Vet Packet on mobile" /><div class="caption">Vet Packet</div></div>
          </section>
        </main>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(galleryDir, "08-mobile-experience.png") });
  await context.close();
}

const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1278, height: 852 }, deviceScaleFactor: 1, colorScheme: "light" });

await captureDesktop(
  desktop,
  "01-today-care.png",
  async (page) => openView(page, "Today"),
  (page) => page.getByRole("heading", { name: "Today care", exact: true })
);
await captureDesktop(
  desktop,
  "02-health-timeline.png",
  async (page) => openView(page, "Timeline"),
  (page) => page.getByRole("heading", { name: "Health timeline", exact: true })
);
await captureDesktop(
  desktop,
  "03-health-trends.png",
  async (page) => openView(page, "Trends"),
  (page) => page.getByRole("heading", { name: "Weight over time", exact: true })
);
await captureDesktop(
  desktop,
  "04-vet-visit-mode.png",
  async (page) => openView(page, "More", "Vet visit mode"),
  (page) => page.locator(".visit-sheet"),
  12
);
await captureDesktop(
  desktop,
  "05-vet-packet.png",
  async (page) => openView(page, "Emergency"),
  (page) => page.locator(".emergency-sheet"),
  12
);
await captureDesktop(
  desktop,
  "06-longevity-tracker.png",
  async (page) => openView(page, "More", "Longevity"),
  (page) => page.getByRole("heading", { name: "Prevention checklist", exact: true }),
  76
);
await captureDesktop(
  desktop,
  "07-what-changed.png",
  async (page) => openView(page, "More", "What changed"),
  (page) => page.getByRole("heading", { name: "What changed recently?", exact: true })
);

await captureDesktopTop(desktop, "09-app-overview.png");
await captureDesktop(
  desktop,
  "10-today-insights.png",
  async (page) => openView(page, "Today"),
  (page) => page.getByRole("heading", { name: "What changed this week", exact: true })
);
await captureDesktop(
  desktop,
  "11-care-plan.png",
  async (page) => openView(page, "Care Plan"),
  (page) => page.getByRole("heading", { name: "Care plan", exact: true })
);
await captureDesktop(
  desktop,
  "12-vet-documents.png",
  async (page) => openView(page, "More", "Documents"),
  (page) => page.getByRole("heading", { name: "Vet documents", exact: true }),
  24,
  prepareInternalDemo
);
await captureDesktop(
  desktop,
  "13-longevity-routines.png",
  async (page) => {
    await openView(page, "More", "Longevity");
    await page.getByRole("button", { name: "Routines", exact: true }).click();
  },
  (page) => page.getByRole("heading", { name: "Daily and weekly habits", exact: true }),
  76
);
await captureDesktop(
  desktop,
  "14-vet-visit-details.png",
  async (page) => openView(page, "More", "Vet visit mode"),
  (page) => page.locator(".visit-sheet").getByRole("heading", { name: "Symptoms", exact: true })
);
await captureDesktop(
  desktop,
  "15-vet-packet-details.png",
  async (page) => {
    await openView(page, "Emergency");
    await page.getByRole("button", { name: /^Vet contacts/ }).click();
  },
  (page) => page.getByRole("button", { name: /^Vet contacts/ })
);

await desktop.close();
await captureMobileComposite(browser);
await browser.close();

console.log(`Updated 15 Devpost gallery images in ${galleryDir}`);
