# Continuum: Pet Health Memory

## Inspiration

I am 27, I am from Argentina, and five years ago I adopted my dog Orejas from the streets. His name means "ears" in Spanish. He is six years old now, a mixed-breed dog, and very much the baby of the family.

When I adopted him, I did not know yet that we would spend so much time going to vets and physiotherapy. He has problems with his back and hips, and also a sensitive stomach. Sometimes he starts limping, then gets better, then something changes again. A medication may help one problem but upset his stomach. There are exercises to remember, follow-up appointments, food changes, test results, invoices, and many small instructions from different professionals.

I always thought I would remember everything because he is my dog and of course I pay attention to him. But after some time, the information was everywhere. Some things were in my calendar, some in WhatsApp conversations, some in photos and videos, and some only in my memory.

Then I would arrive at the vet and get questions like, "When did this start?" or "Did it happen before or after the medication?" I knew I had the information somewhere, but finding it while I was already worried was another problem.

That is why I started Continuum. I wanted one place where I could keep Orejas' health history and open it when I needed it. Something comfortable and easy to use, not a complicated hospital system and not an app giving me generic pet advice.

I started this mainly for him, but I know I am not the only person with this problem. Many people are caring for senior pets, chronically ill pets, rescue animals with incomplete histories, or pets that see different vets and therapists. We love our furry babies, but love does not magically make us remember every date, symptom, and instruction.

## What it does

Continuum is a private health memory and care tracker for pets. It helps owners keep the full story together and explain it clearly to a vet.

You can record symptoms, vet visits, medications, physiotherapy, behavior changes, diet changes, procedures, test results, expenses, reminders, and care instructions. You can also attach photos and documents, so an invoice, lab result, or video does not get lost in the phone gallery.

I organized the main parts around the questions I normally have:

- **Today:** What do I need to do or remember today?
- **Timeline:** What happened, and when?
- **What Changed:** What was different in the last 7, 30, or 90 days?
- **Vet Visit Mode:** What should I bring up at the next appointment?
- **Vet Packet:** What would a vet need to know quickly, especially in an emergency?

The Vet Packet includes allergies, conditions, active medications, care instructions, vet contacts, and recent events. It can be printed, saved as a PDF, shared, or exported as HTML. This is the part I would want ready if Orejas had to see a new vet and I was too stressed to explain everything from memory.

There is also a longevity section for preventive care, routines, mobility, appetite, hydration, quality-of-life notes, and things the owner has been asked to monitor. It is a supporting part of the app, not a promise to make a pet live longer.

Continuum supports more than one pet and also non-conventional species. New accounts start empty, so a real user adds their own pet instead of receiving fake information. Milo the dog and Juno the bearded dragon are available as optional demo profiles. Their data is temporary and never mixes with the user's real household.

The app does not diagnose illnesses or recommend treatments. It helps owners record observations and prepare questions to discuss with a veterinarian.

## How we built it

I built Continuum as a Progressive Web App with Next.js, React, TypeScript, and Tailwind CSS. Supabase is used for authentication, the PostgreSQL database, cross-device sync, and private document storage. Row Level Security keeps each account's records separate.

The app saves locally first and can still work without Supabase or a paid API. Files that stay only on the device use IndexedDB. I wanted the basic care record to remain useful even if the internet connection is not great.

I built the project with Codex using GPT-5.6. It was not one prompt that produced a finished app. It was much more like a long conversation.

I would explain one part of the problem, Codex would inspect the existing project and implement it, and then I would open the app and test it. Sometimes I liked the result. Other times I sent a screenshot and said things like, "This is too crowded," "This is in the wrong place," or "This does not feel like a normal app yet." Then we changed it and tested again.

Codex and GPT-5.6 helped me turn the idea into TypeScript models and real user flows, connect Supabase, fix authentication and synchronization problems, review security, improve mobile behavior, and create Playwright tests. We also worked through hydration errors, account data isolation, private file uploads, PWA behavior, and print-friendly Vet Packets.

GPT-5.6 was especially helpful for keeping the full context of the project while we moved between product decisions, design, security, and testing. I still made the decisions about what I wanted the app to be, and I corrected things when they did not feel right for a real pet owner.

This use of GPT-5.6 through Codex is separate from the optional AI summary inside the app. Continuum's main features work without a paid AI API. If the optional summary is enabled, it is still written as observations and questions, not as medical advice.

## Challenges we ran into

The first big challenge was the amount of information. An early version had most of the features, but everything looked like a box with more text inside it. It felt more like a busy business dashboard than something I would want to open while caring for Orejas. I asked for many design changes before it started to feel calmer and easier to understand.

Synchronization was also difficult. I wanted changes to save quickly on the device, but I also wanted the same account to work on a laptop and a phone. At the same time, two people using the same browser should never see each other's pet information. We had to handle account-scoped local storage, cloud updates, conflicts, sign-out, and deletion carefully.

Mobile use needed more work than I expected. A screen can look perfectly fine on a laptop and be annoying on a phone. I had to think about menus, forms, touch targets, safe areas, uploads, and what someone can realistically do with one hand.

Another challenge was the medical boundary. I wanted the app to be useful, but I did not want it to sound like it was diagnosing a pet. We changed wording several times so the app stays focused on remembering, noticing, and preparing for a professional conversation.

I also learned how to work better with Codex. Giving specific feedback, sharing screenshots, asking it to test the result, and building in smaller batches worked much better than asking for everything at once.

## Accomplishments that we're proud of

I am proud that Continuum is a real working app and not only a design or a presentation. A new user can create an account, add their own pet, record care, upload private documents, sync between devices, and prepare for a vet visit.

The two parts I am most proud of are Vet Visit Mode and the Vet Packet. They are very close to the original problem I wanted to solve. They take information that would normally be spread across many places and make it useful at the exact moment it is needed.

I am also proud that the app works without paid AI, supports animals beyond dogs and cats, and takes privacy seriously. The demo animals are optional and temporary, while every new account begins with a blank pet profile.

Most importantly, I now have the kind of organized health history I wanted for Orejas. Even before other people start using it, the project already helps the dog who inspired it.

## What we learned

The biggest thing I learned is that remembering is part of caregiving. Pet owners are often the connection between different appointments, medications, specialists, and all the little changes that happen at home. Helping someone remember can be useful without trying to replace a vet.

I also learned that adding more information is not always an improvement. Sometimes a calm screen with three useful things is much better than a dashboard showing twenty things at once.

Technically, I learned a lot about local-first data, cloud synchronization, Supabase security policies, private file storage, PWA behavior, responsive design, and automated browser testing.

Working with Codex and GPT-5.6 taught me that the best result comes from going back and forth. I did not need to accept the first answer. I could test it, disagree with it, explain why, and keep improving it. That process is a big part of how Continuum became what it is now.

## What's next for Continuum: Pet Health Memory

The next step is to give Continuum to real pet owners and listen to them. I want to understand what they actually log, what they forget, what they need before an appointment, and which parts feel like too much work.

After that, I would like to add secure sharing with family members and caregivers, time-limited Vet Packet links, better recurring reminders, and improved organization for long medical documents. A private emergency QR code could also be useful if the privacy controls are done correctly.

I am waiting before building native iPhone and Android apps. First I want people to use the web and PWA version, because their real behavior will show me what is worth building next.

I made Continuum because of Orejas. My hope is that it helps another pet parent feel less lost and more prepared when the vet asks, "What changed?"
