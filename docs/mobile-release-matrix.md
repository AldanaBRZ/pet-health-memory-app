# Mobile Release Matrix

Run the automated suite first with `pnpm run verify`. Automation covers responsive widths, overflow, touch targets, mobile form sizing, Back/Forward navigation, menu focus and scroll locking, reduced motion, accessible control names, local media uploads, camera input contracts, Vet Packet sharing/print contracts, the manifest, and offline reopening.

Physical-device checks are still required before inviting outside testers because desktop automation cannot reproduce the operating system share sheet, installed-app lifecycle, real camera permissions, email-app redirects, or the exact on-screen keyboard.

## Devices

| Surface | Minimum check |
| --- | --- |
| iPhone Safari | Current iOS Safari, normal browser tab |
| Installed iOS PWA | Add to Home Screen, launch from icon |
| Android Chrome | Current Chrome, normal browser tab |
| Installed Android PWA | Install app, launch from icon |

## Required Scenarios

1. **Sign in and authentication links**
   - Start signed out and confirm only the login page is visible.
   - Sign in with password.
   - Send one magic link, open it from the device email app, and confirm the production URL restores the correct account.
   - Repeat from the installed PWA. Record whether the operating system opens the link in the PWA or browser and confirm the session remains usable either way.

2. **Keyboard and forms**
   - Create a temporary pet and complete every required profile field.
   - Confirm inputs do not trigger unwanted page zoom on focus.
   - Confirm the keyboard does not hide Save, Cancel, date pickers, breed search, or the kg/lb control.
   - Rotate once between portrait and landscape and confirm no horizontal page scrolling appears.

3. **Photos, documents, and camera**
   - Add and replace a pet profile photo from the library.
   - Use Take photo and accept the real camera permission prompt.
   - Upload one PDF and one image document.
   - Use Scan document and confirm the captured image opens again after saving.
   - On a second signed-in device, confirm synced files open and download.

4. **Vet Packet, sharing, and PDF**
   - Open Emergency and verify allergies, conditions, medications, contacts, and recent events.
   - Tap Share Vet Packet, confirm the privacy warning, and open the native share sheet without completing an external send.
   - Print or Save PDF and inspect page breaks, headings, collapsed-section content, and the Not medical advice note.

5. **Navigation and accessibility**
   - Navigate Today -> Timeline -> Care Plan and use system/browser Back and Forward.
   - Open and dismiss the menu with touch, outside tap, and Escape when a hardware keyboard is available.
   - Enable Reduce Motion and confirm transitions are effectively removed.
   - With VoiceOver or TalkBack, traverse the header, primary navigation, menu, Today checklist, and Emergency actions. Record any unlabeled control or confusing reading order.

6. **Installed app and connectivity**
   - Launch once online, close the app completely, enable airplane mode, and reopen it from the home-screen icon.
   - Confirm the saved shell opens and the offline state is understandable.
   - Make a local change, reconnect, reopen, and confirm sync completes without duplicate data.
   - Deploy a newer version, reopen the old installed app, and confirm the update prompt reloads into the new version.

## Screenshot Comparison

Capture the same five screens on iOS and Android at the end of each release:

1. Signed-out login screen.
2. Today at the top of the page.
3. Open app menu.
4. Profile edit with keyboard visible.
5. Emergency Vet Packet actions and essentials.

Compare against the previous release for clipped text, unexpected spacing, changed action order, missing safe-area padding, and horizontal overflow. Store screenshots with the release notes or tester feedback rather than committing personal pet data to the repository.

## Release Record

Record device model, OS/browser version, pass/fail, screenshots, and a short note for every failed scenario. Do not invite external testers until all automated checks pass and no blocking real-device issue remains.
