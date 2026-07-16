# Pet Health Memory App

A health memory and longevity tracker for serious pet parents.

The app supports multi-pet households and non-conventional species. The sample household includes Milo, a dog with physio/vet history, and Juno, a bearded dragon with exotics-vet tracking.

## Local Development

```bash
pnpm install
pnpm dev
```

The app works without paid APIs or external services. Without Supabase env vars, data is stored in the browser with `localStorage`.

## Supabase Sync Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Add:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ALLOWED_TESTER_EMAILS=you@example.com,friend@example.com
ALLOWED_TESTER_EMAILS=you@example.com,friend@example.com
```

5. In Supabase Auth URL settings, set the site URL to your deployed Vercel URL and add local/dev redirect URLs as needed.
6. For a private test, restrict signups/invites in Supabase Auth settings. `NEXT_PUBLIC_ALLOWED_TESTER_EMAILS` is only a browser-visible UX gate, not a security boundary.

When a tester signs in, the app loads their synced pet household if it exists. If not, it migrates the current browser copy into their account. LocalStorage remains the fallback. If a browser has newer local changes than the cloud copy, the app pauses automatic overwrite and asks the tester to review/sync.

Signed-in testers can use **Sign out + clear** to remove the private browser copy, or **Delete data** to delete the synced Supabase row and clear the browser copy. The Supabase schema includes row-level policies for select/insert/update/delete and a JSON size guard.

Exports create portable files that may include private pet health details, vet contacts, medications, microchip/insurance fields, expenses, and reminders. Store them carefully and share them only with people who should see the pet's care history.

## Optional AI Summaries

Set `OPENAI_API_KEY` only if you want the optional "What changed recently?" AI summary. The app still works without it.

AI summaries require:

- a signed-in Supabase user
- the in-app "Use AI summary when signed in" checkbox
- optional inclusion in `ALLOWED_TESTER_EMAILS` when that server-side allowlist is set
- a minimized recent-care payload, excluding vet contact, microchip, and insurance details

Outputs are framed as observations and questions to discuss with a veterinarian, not medical advice.

## Private Files

Profile photos, symptom photos, and vet documents use the private `pet-health-files` Supabase Storage bucket created by `supabase/schema.sql`. Object paths begin with the signed-in user ID and storage policies only allow that user to read, upload, update, or delete those files. Uploads are restricted to PDF and expected image MIME types, with a 10 MB bucket limit and a stricter 5 MB profile-photo limit in the client.

Without Supabase, file contents are stored in browser IndexedDB and marked as device-only. JSON exports contain attachment metadata, not the private file contents, so they are not a complete media backup.

## PWA Testing

The app includes a manifest, service worker, and app icons. On a deployed HTTPS URL, phone testers can use Safari/Chrome's "Add to Home Screen" flow.

Run the full local verification suite with:

```bash
pnpm exec playwright install chromium webkit
pnpm run verify
```

This runs TypeScript, lint, a production build, and Playwright checks across desktop Chromium, Android-like Chromium, and iPhone-like WebKit. The browser suite covers the responsive viewport matrix, horizontal overflow, touch targets, mobile form sizing, navigation history, menu accessibility, reduced motion, local uploads, camera inputs, Vet Packet sharing/print contracts, the manifest, and offline reopening.

Before inviting outside testers, also complete [the physical mobile release matrix](docs/mobile-release-matrix.md). Real-device testing remains necessary for operating-system share sheets, camera permissions, email authentication redirects, installed-PWA lifecycle, and on-screen keyboards.

## Native Apps

Native iOS/Android App Store builds are intentionally deferred until the web/PWA version has active tester feedback.
