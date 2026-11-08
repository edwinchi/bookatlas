import type { ReactNode } from 'react';
import { Link } from 'wouter';

/** Operator details shown on the Privacy Notice and Legal Notice. */
export const OPERATOR = {
  name: 'Atlantean Globals Services',
  kvk: '89423496',
  locality: '8031 DJ Zwolle',
  country: 'the Netherlands',
  email: 'getintouch@apps-pilot.nl',
};

export function OperatorAddress() {
  return <address className="mt-3 not-italic leading-relaxed">
    <strong>{OPERATOR.name}</strong><br />
    {OPERATOR.locality}<br />
    {OPERATOR.country.replace(/^the /, 'The ')}<br />
    Chamber of Commerce (KvK) {OPERATOR.kvk}<br />
    <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-indigo-700 underline underline-offset-4">{OPERATOR.email}</a>
  </address>;
}

export function LegalDocument({ title, version, sections }: { title: string; version: string; sections: { title: string; body: ReactNode }[] }) {
  return <main className="min-h-[100dvh] bg-slate-50 px-4 py-10 sm:py-14">
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline underline-offset-4">← Back to Bookatlas</Link>
      <h1 className="mt-4 font-serif text-3xl font-extrabold text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Version {version}</p>
      <div className="mt-8 space-y-7 text-sm leading-relaxed text-slate-700">
        {sections.map(section => <section key={section.title}>
          <h2 className="mb-2 font-serif text-lg font-bold text-slate-900">{section.title}</h2>
          {section.body}
        </section>)}
      </div>
    </article>
  </main>;
}
