import type { ReactNode } from 'react';
import { PRIVACY_NOTICE_VERSION } from '../auth/signupConsent';
import { LegalDocument, OPERATOR, OperatorAddress } from './LegalDocument';

const mailLink = <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-indigo-700 underline underline-offset-4">{OPERATOR.email}</a>;

const sections: { title: string; body: ReactNode }[] = [
  {
    title: 'Who is responsible',
    body: <>
      <p>Bookatlas is operated by {OPERATOR.name}, registered in the Netherlands, which is the controller of the personal data described here. You can contact us about your data at:</p>
      <OperatorAddress />
    </>,
  },
  {
    title: 'What we collect',
    body: <ul className="list-disc space-y-1.5 pl-5">
      <li><strong>Account:</strong> your name, email address and whether it is verified, held by our sign-in provider.</li>
      <li><strong>Reader profile:</strong> when you joined, when you were last active, your reading streak and books read.</li>
      <li><strong>Sign-up confirmations:</strong> that you confirmed you are 16 or older and which version of this notice you read, with the time.</li>
      <li><strong>Email preferences:</strong> only if you opt in to reading updates, the time and source of that consent, plus delivery status of emails we send you.</li>
      <li><strong>Orders:</strong> when you buy an eBook, which books you bought, the amount, VAT, your name, email address and country as Stripe reports them, the invoice and any refund request with its reason. Card details are handled by Stripe and never reach us.</li>
      <li><strong>On your device only:</strong> your cart, wishlist, reading progress and reader settings are stored in your browser, not on our servers.</li>
    </ul>,
  },
  {
    title: 'Why we use it',
    body: <>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>To provide your account, bookshelf and reader (performance of our contract with you).</li>
        <li>To send reading-update emails, only with your consent, which you can withdraw at any time from <em>Reading updates</em> or the link in every email.</li>
        <li>To keep the service secure, for example rate limiting and abuse prevention (our legitimate interest). Security logs mask your email address.</li>
      </ul>
      <p className="mt-3">You need to provide your name and email address to create an account. Everything else is optional, and you can browse the store without an account.</p>
    </>,
  },
  {
    title: 'Who processes it for us',
    body: <>
      <p>Clerk (sign-in and email verification), Stripe (payments and refunds), Supabase (database hosting), Vercel (application hosting), Resend (email delivery, only if you opt in), and AI providers (OpenRouter, Google Gemini) for text you choose to submit to AI features. Pages load fonts from Google Fonts and cover images from Unsplash, which receive your IP address. We do not sell your personal data, use advertising trackers or run third-party analytics.</p>
      <p className="mt-3">Some of these providers are based in the United States. Transfers outside the European Economic Area rely on the safeguards the GDPR requires, such as the EU–US Data Privacy Framework or the European Commission's standard contractual clauses.</p>
    </>,
  },
  {
    title: 'How long we keep it',
    body: <p>Orders and invoices are kept for 7 years, as Dutch tax law requires; if you delete your account they no longer show your name or email address. We keep your account data until you delete your account. Deleting your account immediately erases your reader profile, email preferences, email delivery records and your sign-in account. Data held only in your browser stays until you clear it.</p>,
  },
  {
    title: 'Your rights',
    body: <>
      <p>You can access, export, correct or delete your data, object to or restrict its use, and withdraw consent at any time. When signed in, open <em>Privacy &amp; data</em> at the top of the store to download everything we hold about you or to delete your account. For any other request, email {mailLink}. We answer within one month.</p>
      <p className="mt-3">If you are unhappy with how we handle your data, you can complain to the Dutch data protection authority, the <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline underline-offset-4">Autoriteit Persoonsgegevens</a>, or to the authority where you live.</p>
    </>,
  },
  {
    title: 'Age',
    body: <p>Bookatlas accounts are for people aged 16 or older.</p>,
  },
  {
    title: 'Changes to this notice',
    body: <p>When this notice changes, we update the version date above. Earlier versions are available on request.</p>,
  },
];

export function PrivacyNotice() {
  return <LegalDocument title="Privacy Notice" version={PRIVACY_NOTICE_VERSION} sections={sections} />;
}
