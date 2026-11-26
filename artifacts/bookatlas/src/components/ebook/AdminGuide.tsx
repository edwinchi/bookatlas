import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { BookOpenCheck, ChevronDown } from 'lucide-react';

/**
 * The administrator's guide (owner request 2026-11-17), shown to administrators on the Publish page.
 * The same guide, with more detail, is docs/runbooks/admin-guide.md.
 */
type Block = { p: string } | { steps: string[] } | { code: string } | { note: string };
const SECTIONS: { id: string; title: string; blocks: Block[] }[] = [
  {
    id: 'daily', title: 'Your daily check (5 minutes)', blocks: [
      { steps: [
        'All submissions: open new eBooks, check the readiness report, then Publish or send feedback.',
        'Natural audiobook orders: approve paid orders (usually within 2 working days). An amber note means a narration is waiting for Google’s free daily limit and continues by itself.',
        'Reported reader notes and group posts: three reports hide an item automatically. Restore it if it is fine, or keep it hidden.',
        'Store feedback: read what readers and authors told you.',
        'Book enquiries (above this guide): answer new messages from “Start my book” by email, then press Mark answered. A link to booksatlas.app/#start-book opens the form directly.',
      ] },
    ],
  },
  {
    id: 'kokoro', title: 'Narrate a book for free on your computer (Kokoro)', blocks: [
      { p: 'Kokoro is a free, open-source voice that runs on your own PC. No tokens, no Google account, no cost. Parts are uploaded one at a time, and the audiobook goes live when the last part arrives. English only.' },
      { steps: [
        'Order the narration for the book in Publish → Natural audiobook (free for administrators).',
        'Open Git Bash in the repository folder, then: cd tools/local-narrator',
        'See the narration id: npm run list',
        'Start (or continue) narrating: npm run narrate -- --narration <id> --voice af_heart',
        'If some parts were already recorded in another voice, add --from-start so the whole book has one voice.',
      ] },
      { code: 'cd /c/projects/bookatlas/tools/local-narrator\nnpm run list\nnpm run narrate -- --narration <id> --voice af_heart' },
      { p: 'Ctrl+C stops after the current part; run the same command again to continue. If the PC restarts, just run it again. While your PC holds the book, the cloud narrator leaves it alone, so the book never gets two voices.' },
      { p: 'Speed on this PC: about 2.5 seconds of work per second of audio (measured on SCROLL OF SOVEREIGNTY). A 60,000-word book takes about 12–15 hours; a 270,000-word book about 2½ days. Leave the PC on and plugged in.' },
      { note: 'Voices: af_heart (best), af_bella, af_nicole, am_michael, am_fenrir, am_puck (American); bf_emma, bf_isabella, bm_george, bm_fable, bm_lewis (British). Hear one first: npm run sample -- --voice bm_george' },
    ],
  },
  {
    id: 'samples', title: 'Audio samples for every book', blocks: [
      { p: 'Every book has a “Listen to Audio Sample” button for everyone, signed in or not. It plays the opening of the book, about 45 seconds. Narrated books use their own first part.' },
      { steps: [
        'After publishing new books, record their samples for free: cd tools/local-narrator, then npm run samples',
        'A book nobody has recorded yet is recorded with the cloud voice the first time someone listens, while Google’s free quota lasts. Otherwise the player says “being prepared”.',
      ] },
    ],
  },
  {
    id: 'cloud', title: 'Cloud narration (Gemini) and the daily schedule', blocks: [
      { p: 'Paid author orders are narrated in the cloud with the Sulafat or Charon voice. On Google’s free tier (10 requests a day) a narration waits for the limit to reset and continues by itself: within the minute for a per-minute limit, and every day at 08:15 UTC through the daily schedule.' },
      { steps: [
        'Nothing to do: the amber note shows when it continues.',
        'To finish faster, turn on billing for the Gemini key in Google AI Studio (aistudio.google.com → API keys → Set up billing). Every part is then charged.',
        'A narration that stopped for another reason shows Resume narration. Press it once the cause is fixed.',
      ] },
    ],
  },
  {
    id: 'sell', title: 'Selling the audiobook', blocks: [
      { p: 'When a narration is done, the author chooses in Publish → Natural audiobook: include it with the eBook, or sell it as an add-on. Readers who bought the eBook before the add-on price was set keep the whole audiobook.' },
      { steps: [
        'Suggested add-on price: €2–5. Readers know it is an AI voice, so a small add-on sells better than studio prices.',
        'Reading along with the device’s own voice always stays free. It is an accessibility feature.',
        'Before advertising “keeps playing with your screen off”, check it on a phone: start Listen, lock the phone, wait about 2 minutes (into the next part), then try pause, play and next on the lock screen.',
      ] },
    ],
  },
  {
    id: 'reader', title: 'The reader and the listening player', blocks: [
      { p: 'What readers get, so you can answer their questions.' },
      { steps: [
        'Pages or scroll: real pages, two side by side on wide screens. Swipe, tap a side or use the arrow keys to turn; tap the middle to hide the toolbars.',
        'Reading preferences (the T button): font, size, line spacing, margins and alignment; pages or scroll and brightness; five themes or any background and text colour.',
        'Contents lists every chapter with its reading time. “Go to” (the page number at the bottom left) opens a page or any place in the book.',
        'Listening (the headphones button) opens a pop-up player: play, pause, stop, back and forward, previous and next chapter, speed 0.5x–3x, and Voice & language with a sample for each language.',
        'Other languages: the device voice reads a translation, paragraph by paragraph. Chrome on a computer translates on the device for free; elsewhere the reader signs in and it counts towards their 40 AI requests a day.',
        'A recorded narration plays in the book’s own language. Another language switches to the device voice.',
      ] },
      { note: 'Emotion: the cloud studio voices (Sulafat, Charon) are told to let the emotion of each passage colour the delivery. Kokoro recordings made on your PC read evenly and do not follow that instruction.' },
    ],
  },
  {
    id: 'read-smarter', title: 'Read smarter (Reading Intelligence)', blocks: [
      { p: 'Read smarter in the menu opens /reading-intelligence. Everything is free for readers: Fast Read and the speed check, reading aids, AI summaries and explanations, comprehension checkpoints (4 questions at a chapter end, every 1,000 words or every 10 minutes; one AI request each), your own text, My progress with goals and streaks, family profiles, Young readers (99 stories, 33 in each of 3 levels: everyday, bedtime, maths and science; a Shapes word group with geometry symbols; 5 languages, recorded natural voices, a tick on each story read) and Schools and teams.' },
      { steps: [
        'Schools and teams need two SQL files, once, in this order in the Supabase SQL editor: migrations-2026-11-25-reading-classes.sql, then migrations-2026-11-25-class-assignments.sql (both in artifacts/api-server/src/bookatlas/db/). Until then the section says it is not available.',
        'Teachers make a class, share the 8-letter code, set the reading list (books and children’s stories) with due dates, set quizzes made from a chapter (one of their 40 AI requests), and download a CSV or PDF report of minutes per week, progress and quiz scores.',
        'Members are told the teacher sees their progress and reading time. Names show as first name and initial. Closing a class deletes its list, quizzes and scores.',
        'Reading e-mails (weekly summary on Sunday, streak reminder) are off until a reader switches them on. They are sent daily at 17:00 UTC and need RESEND_API_KEY and EMAIL_FROM. Every e-mail has a one-click stop link.',
      ] },
      { p: 'After changing a children’s text, record the new clips, then deploy:' },
      { code: 'cd /c/projects/bookatlas/tools/local-narrator\nnpm run young                # English (Kokoro)\nnpm run young -- --lang fr   # French (Piper); also es, pt, nl' },
      { note: 'Words not lighting up with the device voice? Chrome on Android often does not report word positions for Google voices; the sentence still lights up. Recorded voices (audiobooks and Young readers) always light up each word.' },
    ],
  },
  {
    id: 'settings', title: 'Settings and secrets (Vercel)', blocks: [
      { p: 'These live in Vercel → bookatlas → Settings → Environment Variables (Production). After changing one, redeploy so production reads it. Never paste their values in chats, issues or code.' },
      { steps: [
        'NARRATION_WORKER_TOKEN: lets your PC’s narrator upload parts. The same value must be in .env.local.',
        'CRON_SECRET: protects the daily schedules (narration at 08:15 UTC, reading e-mails at 17:00 UTC).',
        'RESEND_API_KEY and EMAIL_FROM: sending e-mail (reading e-mails, new books for followers). Without them nothing is sent.',
        'GEMINI_API_KEY: cloud narration and AI features. Free tier unless billing is on.',
        'STRIPE_*, CLERK_*, SUPABASE_*: payments, sign-in and the database.',
      ] },
    ],
  },
  {
    id: 'honest', title: 'House rules for the store', blocks: [
      { steps: [
        'Only real reviews and ratings from readers. Never write or import reviews (EU Omnibus rules).',
        '“Bestseller” and editorial-review labels only when they are true and sourced.',
        'AI briefings and summaries are labelled as AI. If one fails, the page says so; it never shows made-up text.',
        'Sample titles in the demo catalogue are marked “Sample title · not for sale”.',
      ] },
    ],
  },
];

export function AdminGuide() {
  return (
    <section aria-labelledby="admin-guide" className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white p-4 sm:p-5">
      <h2 id="admin-guide" className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900">
        <BookOpenCheck className="h-5 w-5 text-indigo-600" aria-hidden />Administrator guide
      </h2>
      <p className="mt-1 text-xs text-slate-600">How to run BooksAtlas day to day. Tap a topic to open it.</p>
      <Accordion.Root type="multiple" className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {SECTIONS.map((s) => (
          <Accordion.Item key={s.id} value={s.id}>
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 cursor-pointer">
                {s.title}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="space-y-2.5 px-4 pb-4 text-[13px] leading-relaxed text-slate-700">
              {s.blocks.map((b, i) => (
                'p' in b ? <p key={i}>{b.p}</p>
                  : 'steps' in b ? <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-indigo-600">{b.steps.map((t) => <li key={t}>{t}</li>)}</ol>
                    : 'code' in b ? <pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100"><code>{b.code}</code></pre>
                      : <p key={i} className="rounded-lg bg-amber-50 p-2.5 text-[12px] text-amber-900 ring-1 ring-inset ring-amber-200">{b.note}</p>
              ))}
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
