import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { PRIVACY_NOTICE_VERSION } from '../auth/signupConsent';

const sections: { title: string; body: ReactNode }[] = [
  {
    title: 'Who is responsible',
    body: <p>Bookatlas is operated by Atlantean Globals Services B.V., registered in the Netherlands, which is the controller of the personal data described here.</p>,
  },
  {
    title: 'What we collect',
    body: <ul className="list-disc space-y-1.5 pl-5">
      <li><strong>Account:</strong> your name, email address and whether it is verified, held by our sign-in provider.</li>
      <li><strong>Reader profile:</strong> when you joined, when you were last active, your reading streak and books read.</li>
      <li><strong>Sign-up confirmations:</strong> that you confirmed you are 16 or older and which version of this notice you read, with the time.</li>
      <li><strong>Email preferences:</strong> only if you opt in to reading updates, the time and source of that consent, plus delivery status of emails we send you.</li>
      <li><strong>On your device only:</strong> your cart, wishlist, reading progress and reader settings are stored in your browser, not on our servers.</li>
    </ul>,
  },
  {
    title: 'Why we use it',
    body: <ul className="list-disc space-y-1.5 pl-5">
      <li>To provide your account, bookshelf and reader (performance of our contract with you).</li>
      <li>To send reading-update emails, only with your consent, which you can withdraw at any time from <em>Reading updates</em> or the link in every email.</li>
      <li>To keep the service secure, for example rate limiting and abuse prevention (our legitimate interest). Security logs mask your email address.</li>
    </ul>,
  },
  {
    title: 'Who processes it for us',
    body: <p>Clerk (sign-in and email verification), Supabase (database hosting), Vercel (application hosting), Resend (email delivery, only if you opt in), and AI providers (OpenRouter, Google Gemini) for text you choose to submit to AI features. Pages load fonts from Google Fonts and cover images from Unsplash, which receive your IP address. We do not sell your personal data, use advertising trackers or run third-party analytics.</p>,
  },
  {
    title: 'How long we keep it',
    body: <p>We keep your account data until you delete your account. Deleting your account immediately erases your reader profile, email preferences, email delivery records and your sign-in account. Data held only in your browser stays until you clear it.</p>,
  },
  {
    title: 'Your rights',
    body: <>
      <p>You can access, export, correct or delete your data and object to or restrict its use. When signed in, open <em>Privacy &amp; data</em> at the top of the store to download everything we hold about you or to delete your account. We answer other requests within 30 days.</p>
      <p className="mt-3">You can also complain to the Dutch data protection authority, the Autoriteit Persoonsgegevens.</p>
    </>,
  },
  {
    title: 'Age',
    body: <p>Bookatlas accounts are for people aged 16 or older.</p>,
  },
];

export function PrivacyNotice() {
  return <main className="min-h-[100dvh] bg-slate-50 px-4 py-10 sm:py-14">
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline underline-offset-4">← Back to Bookatlas</Link>
      <h1 className="mt-4 font-serif text-3xl font-extrabold text-slate-950">Privacy Notice</h1>
      <p className="mt-2 text-sm text-slate-500">Version {PRIVACY_NOTICE_VERSION}</p>
      <div className="mt-8 space-y-7 text-sm leading-relaxed text-slate-700">
        {sections.map(section => <section key={section.title}>
          <h2 className="mb-2 font-serif text-lg font-bold text-slate-900">{section.title}</h2>
          {section.body}
        </section>)}
      </div>
    </article>
  </main>;
}
