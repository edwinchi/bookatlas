import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { LegalDocument, OPERATOR, OperatorAddress } from './LegalDocument';

export const LEGAL_NOTICE_VERSION = '2026-11-08';

const sections: { title: string; body: ReactNode }[] = [
  {
    title: 'Who operates Bookatlas',
    body: <>
      <p>Bookatlas, its eBook store and in-browser reader are operated by:</p>
      <OperatorAddress />
    </>,
  },
  {
    title: 'Using the store',
    body: <ul className="list-disc space-y-1.5 pl-5">
      <li>You may browse the store and read samples without an account. Accounts are for people aged 16 or older.</li>
      <li>Keep your sign-in details to yourself. Don't misuse the service, for example by automated scraping, attempts to bypass rate limits or security controls, or interfering with other readers.</li>
      <li>We may suspend accounts used in breach of these terms or the law.</li>
    </ul>,
  },
  {
    title: 'Books and content',
    body: <p>Book texts, covers, audio samples and the Bookatlas name and design are protected by copyright and other intellectual property rights of {OPERATOR.name}, its authors or licensors. Purchases and samples are for your personal, non-commercial reading. You may not copy, redistribute or resell them unless the law allows it.</p>,
  },
  {
    title: 'AI features',
    body: <p>Summaries, recommendations and other text produced by the AI reading companion are generated automatically. They can be incomplete or wrong and are no substitute for the book itself or for professional advice. Only submit text you are entitled to share. See the <Link href="/privacy" className="font-semibold text-indigo-700 underline underline-offset-4">Privacy Notice</Link> for how that text is processed.</p>,
  },
  {
    title: 'Accuracy and liability',
    body: <p>We take care to keep book details, prices and availability correct, but errors can occur and we may correct them. Links to other websites are provided for convenience; we are not responsible for their content. Nothing in these terms limits your rights as a consumer under mandatory law, or our liability where the law does not allow it to be limited.</p>,
  },
  {
    title: 'Questions and complaints',
    body: <p>Email <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-indigo-700 underline underline-offset-4">{OPERATOR.email}</a>. We aim to answer within 14 days. If we can't resolve a complaint together, you may take it to the competent Dutch court or, as a consumer, to the court where you live.</p>,
  },
  {
    title: 'Applicable law',
    body: <p>These terms are governed by Dutch law. If you are a consumer living elsewhere in the EU, you also keep the protection of the mandatory consumer law of your country.</p>,
  },
];

export function LegalNotice() {
  return <LegalDocument title="Legal Notice" version={LEGAL_NOTICE_VERSION} sections={sections} />;
}
