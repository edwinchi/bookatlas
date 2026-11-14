import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { BarChart3, BookCheck, ChevronDown, FileType2, Globe2, Headphones, Sparkles, type LucideIcon } from 'lucide-react';

interface Service {
  id: string;
  icon: LucideIcon;
  name: string;
  price: string;
  priceTone: 'included' | 'addon';
  summary: string;
  details: string[];
  badge?: string;
}

/** What BookAtlas does for an author. Only services that exist today are listed, with their real price. */
export const SERVICES: Service[] = [
  {
    id: 'convert', icon: FileType2, name: 'Word and PDF to EPUB', price: 'Included', priceTone: 'included',
    summary: 'Upload a Word or PDF manuscript and it becomes an EPUB 3 eBook, right in your browser.',
    details: [
      'Chapters from your headings, with a clickable table of contents.',
      'The cover taken from your book: the first picture in Word, or the first page of a PDF with its white margins trimmed.',
      'Title page and copyright page kept; added from your details only when missing.',
      'Your manuscript stays on your device until you press Upload.',
    ],
  },
  {
    id: 'details', icon: Sparkles, name: 'Book details filled in for you', price: 'Included', priceTone: 'included',
    summary: 'Title, author, description, categories and keywords are filled in from your book as soon as you choose the file.',
    details: [
      'Read from your book itself in about a second, without any AI.',
      'Improved by a free AI model when available (OpenRouter or Google Gemini); the opening pages are sent only for this.',
      'Nothing you type is ever replaced, and Undo restores the form.',
    ],
  },
  {
    id: 'prepare', icon: BookCheck, name: 'Store-ready preparation and EPUBCheck', price: 'Included', priceTone: 'included',
    summary: 'We fix what stores reject and validate the book with the official EPUBCheck before it goes on sale.',
    details: [
      'Covers with a back panel cropped to the front; small covers enlarged on request.',
      'Copyright year checked against your details; old EPUB versions upgraded; restricted fonts and heavy images handled.',
      'A readiness report for Amazon KDP and Lulu print, with a correction checklist.',
      'An administrator reviews every book before it is published.',
    ],
  },
  {
    id: 'sell', icon: Globe2, name: 'Sell worldwide, keep 80%', price: '80% to you', priceTone: 'included',
    summary: 'Readers buy with iDEAL, cards, Apple Pay, Google Pay and more; you receive 80% of the price excluding VAT.',
    details: [
      'Everyone can read the free preview; buyers open the whole book at once.',
      'BookAtlas handles VAT and sends every buyer an invoice.',
      'Refunds follow EU consumer law; buyers ask within 14 days and an administrator decides.',
    ],
  },
  {
    id: 'sales', icon: BarChart3, name: 'Sales dashboard', price: 'Included', priceTone: 'included',
    summary: 'See units, revenue, refunds and your share per book and per month.',
    details: [
      'Last 30 days, 12 months or all time.',
      'Recent sales with date and country; buyers are never identified to authors.',
    ],
  },
  {
    id: 'narration', icon: Headphones, name: 'Natural audiobook narration', price: 'from €24.99', priceTone: 'addon', badge: 'New',
    summary: 'Your eBook read aloud by a natural Google Gemini studio voice instead of the robotic device voice, recorded once and played to every reader.',
    details: [
      'Choose Sulafat (warm, female) or Charon (informative, male) after hearing a short sample.',
      'Priced by length, incl. 21% VAT: €24.99 up to 60,000 words (about 220 pages), then €3.99 per extra 10,000 words.',
      'Examples: a 280–290-page book (about 80,000 words) €32.97; a 350-page professional or technical book (about 96,000 words) €40.95; a 400+ page book (about 110,000 words) €44.94. You see the exact price for your book before ordering.',
      'Technical books: code examples and tables are not read aloud; the narrator says “A code example follows in the book” or “A table follows in the book”, and their words are not charged. Diagrams and screenshots are pictures and are not narrated, so a 400-page PDF full of figures costs less than its page count suggests.',
      'Readers hear it with the paragraph being read highlighted, chapter by chapter.',
      'An administrator approves each order before narration starts; you see its progress.',
    ],
  },
];

export function ServicesOverview() {
  return (
    <section aria-labelledby="services-title" className="space-y-4">
      <div>
        <h2 id="services-title" className="font-serif text-xl font-bold text-slate-900">What BookAtlas does for you</h2>
        <p className="mt-1 text-sm text-slate-600">Everything you need to publish and sell your eBook. Open a service to see what is included.</p>
      </div>
      <Accordion.Root type="multiple" className="grid gap-3 md:grid-cols-2">
        {SERVICES.map((s) => (
          <Accordion.Item key={s.id} value={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow data-[state=open]:shadow-md">
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 cursor-pointer">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.priceTone === 'addon' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{s.name}</span>
                    {s.badge && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">{s.badge}</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{s.summary}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.priceTone === 'addon' ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'}`}>{s.price}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
              <ul className="space-y-1.5 border-t border-slate-100 px-4 py-3 pl-[4.25rem] text-xs leading-relaxed text-slate-700">
                {s.details.map((d) => <li key={d} className="list-disc">{d}</li>)}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
