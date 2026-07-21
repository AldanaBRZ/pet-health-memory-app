import { chromium } from "@playwright/test";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3011";
const speed = Number(process.env.DEMO_SPEED ?? "1");
const root = process.cwd();
const videoDir = path.join(root, "devpost-assets", "video");
const recordingDir = path.join(root, "test-results", "devpost-demo-recording");
const output = path.join(videoDir, "continuum-live-demo-silent.webm");
const chaptersOutput = path.join(videoDir, "continuum-live-demo-chapters.json");
const viewport = { width: 1280, height: 720 };

await mkdir(videoDir, { recursive: true });
await mkdir(recordingDir, { recursive: true });

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, Math.max(20, milliseconds * speed)));

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

async function showSvg(page, fileName) {
  const svg = await readFile(path.join(videoDir, fileName), "utf8");
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #f6f4ef; }
          svg { display: block; width: 100%; height: 100%; }
        </style>
      </head>
      <body>${svg}</body>
    </html>
  `);
}

async function installDemoPointer(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal { display: none !important; }
      html, body, button, a, input, select, textarea, label { cursor: none !important; }
      #continuum-demo-pointer {
        position: fixed;
        z-index: 2147483647;
        width: 30px;
        height: 38px;
        pointer-events: none;
        transform: translate(-3px, -3px);
        filter: drop-shadow(0 2px 3px rgba(23, 33, 49, 0.32));
      }
      .continuum-click-ripple {
        position: fixed;
        z-index: 2147483646;
        width: 28px;
        height: 28px;
        pointer-events: none;
        border: 4px solid #cf5c49;
        border-radius: 999px;
        transform: translate(-50%, -50%) scale(0.2);
        animation: continuum-click-ripple 620ms ease-out forwards;
      }
      @keyframes continuum-click-ripple {
        0% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.2); }
        70% { opacity: 0.62; }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(2.5); }
      }
    `
  });

  await page.evaluate(() => {
    const pointer = document.createElement("div");
    pointer.id = "continuum-demo-pointer";
    pointer.innerHTML = `
      <svg viewBox="0 0 30 38" width="30" height="38" aria-hidden="true">
        <path d="M4 3.5v25.2l6.2-5.8 4.6 10.8 5.4-2.4-4.7-10.4 8.4-.2L4 3.5Z" fill="#172131" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
      </svg>
    `;
    pointer.style.left = "1080px";
    pointer.style.top = "88px";
    document.body.append(pointer);

    document.addEventListener("mousemove", (event) => {
      pointer.style.left = `${event.clientX}px`;
      pointer.style.top = `${event.clientY}px`;
    });

    window.__continuumDemoRipple = (x, y) => {
      const ripple = document.createElement("div");
      ripple.className = "continuum-click-ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      document.body.append(ripple);
      window.setTimeout(() => ripple.remove(), 700);
    };
  });

  await page.mouse.move(1080, 88);
}

async function movePointer(page, x, y, duration = 700) {
  const steps = Math.max(12, Math.round((duration * speed) / 22));
  const start = await page.evaluate(() => {
    const pointer = document.querySelector("#continuum-demo-pointer");
    return {
      x: Number.parseFloat(pointer?.style.left || "1080"),
      y: Number.parseFloat(pointer?.style.top || "88")
    };
  });

  for (let index = 1; index <= steps; index += 1) {
    const raw = index / steps;
    const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const nextX = start.x + (x - start.x) * eased;
    const nextY = start.y + (y - start.y) * eased;
    await page.mouse.move(nextX, nextY);
    await pause(duration / steps);
  }
}

async function moveTo(page, locator, duration = 700) {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error("Could not measure demo target");
  await movePointer(page, box.x + box.width / 2, box.y + box.height / 2, duration);
}

async function ripple(page, x, y) {
  await page.evaluate(({ clickX, clickY }) => {
    window.__continuumDemoRipple?.(clickX, clickY);
  }, { clickX: x, clickY: y });
}

async function clickAt(page, x, y) {
  await movePointer(page, x, y, 520);
  await page.mouse.down();
  await ripple(page, x, y);
  await pause(110);
  await page.mouse.up();
  await pause(480);
}

async function click(page, locator, options = {}) {
  const { settle = 700, duration = 700 } = options;
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error("Could not measure clickable demo target");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await movePointer(page, x, y, duration);
  await ripple(page, x, y);
  await pause(90);
  await locator.click();
  await pause(settle);
}

async function smoothScrollTo(page, locator, top = 82) {
  await locator.waitFor({ state: "visible" });
  const destination = await locator.evaluate((element, targetTop) => (
    window.scrollY + element.getBoundingClientRect().top - targetTop
  ), top);
  const start = await page.evaluate(() => window.scrollY);
  const steps = Math.max(18, Math.round(44 * speed));

  for (let index = 1; index <= steps; index += 1) {
    const raw = index / steps;
    const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    await page.evaluate((nextY) => window.scrollTo(0, nextY), start + (destination - start) * eased);
    await pause(22);
  }
  await pause(320);
}

async function clickPrimary(page, name) {
  const button = page.getByRole("button", { name, exact: true });
  await smoothScrollTo(page, button, 120);
  await click(page, button);
}

async function clickMoreView(page, name) {
  await clickPrimary(page, "More");
  const button = page.getByRole("button", { name, exact: true });
  await click(page, button);
}

async function fadeToIvory(page) {
  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#f6f4ef;opacity:0;pointer-events:none;transition:opacity 480ms ease";
    document.body.append(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = "1"; });
  });
  await pause(560);
}

const browser = await chromium.launch();

const warmup = await browser.newContext({ viewport, colorScheme: "light" });
const warmupPage = await warmup.newPage();
await warmupPage.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
await warmupPage.locator('[data-app-ready="true"][data-demo-mode="public"]').waitFor();
await warmup.close();

const context = await browser.newContext({
  viewport,
  colorScheme: "light",
  recordVideo: { dir: recordingDir, size: viewport }
});
const page = await context.newPage();
const video = page.video();
const startedAt = Date.now();
const chapters = [];

function chapter(title) {
  const seconds = (Date.now() - startedAt) / 1000;
  chapters.push({ title, seconds: Number(seconds.toFixed(2)) });
  console.log(`${formatTime(seconds)}  ${title}`);
}

chapter("Opening");
await showSvg(page, "title-slide.svg");
await pause(7000);

chapter("App overview");
await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
await page.locator('[data-app-ready="true"][data-demo-mode="public"]').waitFor();
await installDemoPointer(page);
await pause(1600);
await moveTo(page, page.getByRole("heading", { name: "Milo", exact: true }), 850);
await pause(1000);
await click(page, page.getByRole("button", { name: "Open app menu", exact: true }));
await pause(1700);
await clickAt(page, 820, 390);
await pause(1300);

chapter("Today care");
const todayHeading = page.getByRole("heading", { name: "Today care", exact: true });
await smoothScrollTo(page, todayHeading, 34);
await pause(2100);
await click(page, page.getByRole("button", { name: "Mark Give Dasuquin with breakfast complete", exact: true }));
await pause(2400);

chapter("Searchable timeline");
await clickPrimary(page, "Timeline");
const timelineHeading = page.getByRole("heading", { name: "Health timeline", exact: true });
await smoothScrollTo(page, timelineHeading, 30);
await pause(1500);
const search = page.getByPlaceholder("Search notes, source, body area...");
await click(page, search, { settle: 250 });
await page.keyboard.type("limp", { delay: Math.max(35, 95 * speed) });
await pause(3300);
await page.keyboard.press("Meta+A");
await page.keyboard.press("Backspace");
await pause(600);

chapter("What changed");
await clickMoreView(page, "What changed");
const changedHeading = page.getByRole("heading", { name: "What changed recently?", exact: true });
await smoothScrollTo(page, changedHeading, 38);
await pause(1500);
await click(page, page.getByRole("button", { name: "7d", exact: true }));
await pause(1600);
await click(page, page.getByRole("button", { name: "30d", exact: true }));
await pause(2800);

chapter("Vet Visit Mode");
await click(page, page.getByRole("button", { name: "Vet visit mode", exact: true }));
const visitSheet = page.locator(".visit-sheet");
await smoothScrollTo(page, visitSheet, 12);
await pause(3200);
await moveTo(page, visitSheet.getByRole("heading", { name: "Questions to discuss", exact: true }), 700);
await pause(2500);
await smoothScrollTo(page, visitSheet.getByRole("heading", { name: "Symptoms", exact: true }), 28);
await pause(3600);

chapter("Vet Packet");
const openPacket = page.getByRole("button", { name: "Open Vet Packet", exact: true });
await smoothScrollTo(page, openPacket, 110);
await click(page, openPacket);
const packet = page.locator(".emergency-sheet");
await smoothScrollTo(page, packet, 12);
await pause(3500);
const contacts = page.getByRole("button", { name: /^Vet contacts/ });
await smoothScrollTo(page, contacts, 120);
await click(page, contacts);
await smoothScrollTo(page, contacts, 30);
await pause(3500);

chapter("Care Plan and trends");
await clickPrimary(page, "Care Plan");
const carePlan = page.getByRole("heading", { name: "Care plan", exact: true });
await smoothScrollTo(page, carePlan, 30);
await pause(3200);
await clickPrimary(page, "Trends");
const trends = page.getByRole("heading", { name: "Weight over time", exact: true });
await smoothScrollTo(page, trends, 32);
await pause(3500);
await moveTo(page, page.getByText("30.4", { exact: true }).first(), 900);
await pause(1000);

chapter("Longevity and documents");
await clickMoreView(page, "Longevity");
const prevention = page.getByRole("heading", { name: "Prevention checklist", exact: true });
await smoothScrollTo(page, prevention, 84);
await pause(2600);
await click(page, page.getByRole("button", { name: "Routines", exact: true }));
const routines = page.getByRole("heading", { name: "Daily and weekly habits", exact: true });
await smoothScrollTo(page, routines, 84);
await pause(2200);
await click(page, page.getByRole("button", { name: "Mark today", exact: true }).first());
await pause(1900);
await clickMoreView(page, "Documents");
const documents = page.getByRole("heading", { name: "Vet documents", exact: true });
await smoothScrollTo(page, documents, 32);
await pause(3600);

chapter("Built with Codex and GPT-5.6");
await fadeToIvory(page);
await showSvg(page, "codex-gpt-slide.svg");
await pause(13000);

chapter("Closing");
await showSvg(page, "end-slide.svg");
await pause(7000);

const duration = (Date.now() - startedAt) / 1000;
chapters.push({ title: "End", seconds: Number(duration.toFixed(2)) });
console.log(`${formatTime(duration)}  End`);

await page.close();
if (!video) throw new Error("Playwright did not create a video recording");
const recordedPath = await video.path();
await copyFile(recordedPath, output);
await writeFile(chaptersOutput, `${JSON.stringify({ duration, chapters }, null, 2)}\n`);
await context.close();
await browser.close();

if (duration > 180) {
  throw new Error(`Demo duration is ${duration.toFixed(1)} seconds, over the 3-minute maximum`);
}

console.log(`Created ${output}`);
console.log(`Duration: ${duration.toFixed(1)} seconds`);
