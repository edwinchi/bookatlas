import type { ReactNode } from 'react';
import { LegalDocument, OPERATOR } from './LegalDocument';

export const REFUND_POLICY_VERSION = '2026-11-14';

const mail = <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-indigo-700 underline underline-offset-4">{OPERATOR.email}</a>;

const sections: { title: string; body: ReactNode }[] = [
  {
    title: 'Try before you buy',
    body: <p>Every Bookatlas eBook has a free preview: anyone can read and listen to it up to and including its introduction or first chapter, without an account and without paying. Please use it to decide whether a book is right for you.</p>,
  },
  {
    title: 'Your 14-day right of withdrawal',
    body: <>
      <p>EU consumer law gives you 14 days to withdraw from an online purchase without giving a reason (Directive 2011/83/EU, art. 9; Dutch Civil Code art. 6:230o). For digital content such as eBooks this right ends once the content is supplied, but only if you expressly asked for immediate access and acknowledged that you lose the right (art. 16(m)).</p>
      <p className="mt-3">At checkout Bookatlas asks you to tick a box for exactly that. The time you ticked it is recorded and confirmed on your invoice (art. 8(7)). If no such consent is recorded for an order, your right of withdrawal still applies and we refund it within 14 days of purchase on request, no reason needed.</p>
    </>,
  },
  {
    title: 'Faulty or not as described',
    body: <p>Whatever you agreed at checkout, an eBook must work and match its description. If the file does not open, is damaged, incomplete, or clearly not the book its page describes, you are entitled to have it fixed or, if we cannot, to a full refund (Directive (EU) 2019/770, art. 14; Dutch Civil Code art. 7:50aa and following). Tell us within 14 days through <em>Request refund</em>, or email us later; this right is not limited to 14 days.</p>,
  },
  {
    title: 'Other refund requests',
    body: <>
      <p>Beyond what the law requires, you can ask for a refund within <strong>14 days of purchase</strong>, for example when you bought the same book twice or bought it by mistake and have not read beyond the free preview.</p>
      <p className="mt-3">We may decline such a request when the book has been read in full or largely, or when an account repeatedly buys and refunds books. Authors are paid from sales, so refunds are for genuine problems, not for borrowing.</p>
    </>,
  },
  {
    title: 'How to ask',
    body: <p>Sign in, open <em>Orders &amp; invoices</em> at the top of the store and choose <em>Request refund</em> next to the order. We reply within 2 working days. You can also email {mail} with your invoice number (it starts with BA-).</p>,
  },
  {
    title: 'How refunds are paid',
    body: <p>Approved refunds are made in full within 14 days, to the same card or payment method you used (Directive 2011/83/EU, art. 13), through Stripe; we start them the day we approve. Your bank usually shows the money within 5 to 10 working days. The book then returns to preview only and your invoice is marked <em>Refunded</em>.</p>,
  },
  {
    title: 'Disputes',
    body: <p>If we cannot agree, you can contact the Dutch consumer authority (ACM ConsuWijzer) or your national consumer centre through the European Consumer Centres Network. Your statutory rights are never limited by this policy.</p>,
  },
];

export function RefundPolicy() {
  return <LegalDocument title="Refund Policy" version={REFUND_POLICY_VERSION} sections={sections} />;
}
