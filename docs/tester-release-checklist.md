# Tester Release Checklist

Use this before sending the app to outside testers.

## External Setup To Remember

1. In Vercel, confirm the production environment variables are current:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ALLOWED_TESTER_EMAILS`
   - `ALLOWED_TESTER_EMAILS`, if AI summaries should be restricted server-side
   - `OPENAI_API_KEY`, only if optional AI summaries should be enabled
   - `OPENAI_MODEL`, optional

2. In Supabase, rerun `supabase/schema.sql` after schema/security changes.
   - This applies database-side changes that GitHub/Vercel cannot apply by themselves.
   - Existing important protection is row-level security on `pet_memories`.
   - Confirm the private `pet-health-files` Storage bucket exists after running the SQL.
   - Confirm the bucket is not public and its object policies scope access to the signed-in user ID folder.

3. In Supabase Auth settings, check tester access before sharing the link.
   - Keep the production Site URL pointed at the Vercel production URL.
   - Keep local/dev redirect URLs only as needed.
   - For a private beta, restrict signups/invites in Supabase Auth. Do not rely only on `NEXT_PUBLIC_ALLOWED_TESTER_EMAILS`, because public env vars are visible in browser code.

4. Test the deployed app in a fresh/private browser session.
   - Signed-out users should see the login/selling page, not demo pet data.
   - A tester email should be able to sign in.
   - Creating/editing a pet should sync without a permission error.
   - Upload one profile image and one test PDF/image, then open and download both from a second signed-in browser.
   - Delete the test document and confirm Undo restores it before the countdown ends.
   - Sign out should clear the browser copy.
   - Export warnings should appear before JSON or Vet Packet HTML downloads, and should explain that private file contents are not embedded.

5. For phone testers, open the production HTTPS URL and use Add to Home Screen.

## Short Reminder

When Aldana says she is ready to give this to users for testing, remind her to check Vercel env vars, rerun Supabase SQL, verify the private Storage bucket and policies, verify Supabase Auth access, and do one private-browser smoke test before sending the link.
