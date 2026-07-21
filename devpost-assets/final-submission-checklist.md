# Continuum Final Submission Checklist

Do not mark the Devpost project as submitted until every required checkbox below is complete.

## Repository Access

- [ ] Decide whether the GitHub repository will remain private or become public.
- [ ] If it remains private, share it with both organizer addresses:
  - `testing@devpost.com`
  - `build-week-event@openai.com`
- [ ] Open the repository link in a signed-out/private browser and confirm the intended reviewer access works.
- [ ] Confirm the repository contains the latest submitted build.

Current status on July 21, 2026: `AldanaBRZ/pet-health-memory-app` is **PRIVATE** and is not accessible in a signed-out browser.

Access check on July 21, 2026: the repository lists only `AldanaBRZ` as a collaborator and has no pending invitations. Reviewer access is still required.

## Fresh Product Test

- [ ] Run `pnpm install` from a clean checkout or clean dependency state.
- [x] Run the equivalent `typecheck`, `lint`, and full `test:e2e` checks.
- [x] Run a production build.
- [x] Open the production Vercel URL in a signed-out browser and check console errors.
- [ ] Confirm a judge can reach either a public read-only demo or documented test access without needing to contact the creator.
- [ ] Create a fresh account and complete the required first-pet profile.
- [ ] Add, edit, and delete one symptom, medication, contact, reminder, and document.
- [ ] Sign into the same account in a second browser and confirm data synchronization.
- [ ] Open the temporary Milo and Juno demos and confirm they do not enter or overwrite the real household.
- [ ] Open Vet Visit Mode and the Vet Packet on desktop and phone widths.
- [ ] Verify print/save-PDF, HTML export, uploads, sign-out, and account deletion.

Automated check on July 21, 2026: typecheck passed; lint completed with 0 errors and 10 existing warnings; the production build passed; Playwright reported 28 passed and 20 intentionally skipped across desktop Chromium, Android-style Chromium, and iPhone-style WebKit. The signed-out production page loaded with no browser console errors.

The judge-access risk is resolved: the public, session-only demo is available at `https://pet-health-memory-app.vercel.app/demo` without an account, and its changes are not saved or synced.

## Demo Video

- [x] Use the final interactive silent cut at `devpost-assets/video/continuum-live-demo-silent.mp4`.
- [ ] Record the supplied timestamped voiceover in a quiet room.
- [ ] Make sure the voiceover explicitly says **Codex** and **GPT-5.6** and explains what each contributed.
- [ ] Explain that GPT-5.6 was used during development through Codex and is separate from the app's optional runtime AI summary.
- [ ] Watch the entire final video with headphones.
- [ ] Confirm speech is clear, no loading or long idle typing is visible, and the video stays under three minutes.
- [ ] Upload it to YouTube as Public or Unlisted.
- [ ] Open the YouTube URL in a private browser.
- [ ] Paste the URL into Devpost's **Video demo link** field.

Video asset check on July 21, 2026: the interactive silent cut is H.264 MP4, 1280 x 720, 147.533 seconds, and 40 MB. Fifteen chapter frames were extracted and visually reviewed. The live cursor, expanding click ripples, scrolling, interactions, Codex/GPT-5.6 slide, and closing slide all rendered correctly.

## Codex Session ID

- [ ] In this existing Codex task, type `/feedback` in the composer.
- [ ] Choose to include/share the existing session when the feedback dialog asks.
- [ ] Submit the feedback.
- [ ] Copy the session ID shown after submission.
- [ ] Paste that exact ID into the Devpost `/feedback Codex Session ID` field.

The Codex manual says `/feedback` opens the feedback dialog and can include the existing session. After submission, it provides the session ID to share with the team.

## Project Page

- [ ] Use `devpost-assets/project-story.md` as the final story.
- [ ] Read it aloud once and replace any wording that does not sound like something Aldana would naturally say.
- [ ] Add the live Vercel link.
- [ ] Add the GitHub link only after repository access is confirmed.
- [ ] Upload the thumbnail and all fifteen gallery images in the documented order.
- [ ] Confirm the project story explains the inspiration, product, build, challenges, accomplishments, learning, and next steps.
- [ ] Confirm the story and README describe the actual Codex and GPT-5.6 workflow.

## README

- [ ] Confirm local setup instructions work from a clean checkout.
- [ ] Confirm Supabase setup and required environment variables are documented.
- [ ] Confirm Milo and Juno sample/demo data are documented.
- [ ] Confirm the Codex and GPT-5.6 development workflow is documented.
- [ ] Confirm private-file, PWA, test, and optional runtime AI behavior are documented.

## Devpost Submission

- [ ] Add every team member to Devpost.
- [ ] Confirm every team member has accepted the invitation.
- [ ] Preview the public project page.
- [ ] Check every link and media item from the public preview.
- [ ] Mark the submission as **Submitted**, not Draft.
- [ ] Reopen Devpost and confirm the submitted status is still shown.
