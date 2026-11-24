import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Slider from '@radix-ui/react-slider';
import { ArrowLeft, ArrowRight, BookMarked, BookOpen, Calculator, Check, ExternalLink, Headphones, Info, Library, Mail } from 'lucide-react';
import { PAPERS, TRIM_SIZES, inchesToMm, printCoverSpec, type PaperId, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';
import { PLANS, monthlyEarnings, proPaysMoreFrom, type PlanId } from '../landing/earnings';
import { enquiryHref } from '../StartBookDialog';
import { OPERATOR } from '../LegalDocument';
import { PRINT_PACKAGES, RATES_CHECKED, audiobookPlan, ebookComparison, excludingVat, printEarnings } from './pricing';
import { SelectBox } from '../ui/select-box';

type Product = 'ebook' | 'audiobook' | 'paperback' | 'hardcover';
const PRODUCTS: { id: Product; label: string; hint: string; icon: React.ElementType }[] = [
  { id: 'ebook', label: 'eBook', hint: 'Sell worldwide, keep 81%', icon: BookOpen },
  { id: 'audiobook', label: 'Audiobook', hint: 'Natural voice, from €24.99', icon: Headphones },
  { id: 'paperback', label: 'Paperback', hint: 'Sold and shipped by BooksAtlas', icon: BookMarked },
  { id: 'hardcover', label: 'Hardcover', hint: 'Printed on demand, shipped worldwide', icon: Library },
];
/** VAT on eBooks and audiobooks where the buyer lives (the store charges the buyer's rate). */
const VAT = [
  { id: '9', label: 'Netherlands (9% VAT)' }, { id: '7', label: 'Germany (7%)' }, { id: '6', label: 'Belgium (6%)' },
  { id: '5.5', label: 'France (5.5%)' }, { id: '4', label: 'Spain or Italy (4%)' }, { id: '0', label: 'United Kingdom or outside the EU (0%)' },
];

const euro = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-500';
const label = 'block text-xs font-semibold text-slate-700';
const PUBLISH_HREF = `${import.meta.env.BASE_URL}user-portal?view=publish`;

const Section: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <h2 className="font-serif text-lg font-bold text-slate-900">{title}</h2>
      {aside}
    </div>
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

const Money: React.FC<{ value: string; caption: string }> = ({ value, caption }) => (
  <div>
    <p className="font-serif text-4xl font-bold tracking-tight">{value}</p>
    <p className="mt-1 text-xs text-indigo-100">{caption}</p>
  </div>
);

/**
 * The pricing calculator (owner request 2026-11-23, after Lulu's): choose a product, set its options and see what it
 * costs and what each sale earns, next to the other platforms' published rates.
 */
export default function PricingPage() {
  useEffect(() => {
    const title = document.title;
    document.title = 'Pricing calculator: what you earn | BooksAtlas';
    return () => { document.title = title; };
  }, []);

  const [product, setProduct] = useState<Product>('ebook');
  const [vat, setVat] = useState('9');
  const vatPercent = Number(vat);
  // eBook
  const [price, setPrice] = useState(8.99);
  const [copies, setCopies] = useState(25);
  const [plan, setPlan] = useState<PlanId>('standard');
  const [fileMb, setFileMb] = useState(2);
  // Audiobook
  const [words, setWords] = useState(70_000);
  const [audioPrice, setAudioPrice] = useState(9.99);
  // Print
  const [trimSize, setTrimSize] = useState<TrimSizeId>('6x9');
  const [paper, setPaper] = useState<PaperId>('cream');
  const [pages, setPages] = useState(220);
  const [printPrice, setPrintPrice] = useState(14.99);
  const [printCost, setPrintCost] = useState<number | ''>('');

  const binding = product === 'hardcover' ? 'hardcover' : 'paperback';
  const rows = useMemo(() => ebookComparison(price, vatPercent, fileMb), [price, vatPercent, fileMb]);
  const ours = rows.find((r) => r.id === (plan === 'pro' ? 'booksatlas-pro' : 'booksatlas'))!;
  const month = monthlyEarnings(excludingVat(price, vatPercent), copies, plan);
  const proFrom = proPaysMoreFrom(excludingVat(price, vatPercent));
  const audio = audiobookPlan(words, audioPrice, vatPercent);
  const spec = printCoverSpec(trimSize, paper, Math.max(24, pages || 24), binding);
  const print = printEarnings(printPrice, vatPercent, Number(printCost) || 0);
  const tooFew = binding === 'hardcover' ? pages < 75 || pages > 550 : pages < 24 || pages > 800;

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-[radial-gradient(ellipse_60%_120%_at_85%_0%,rgba(99,102,241,0.25),transparent),linear-gradient(to_bottom,#232272,#1c1b5a)] px-4 pb-10 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-indigo-100 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden />Back to BooksAtlas</Link>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300"><Calculator className="h-4 w-4" aria-hidden />Pricing calculator</p>
              <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">See what your book costs and what every sale earns</h1>
              <p className="mt-3 text-sm leading-relaxed text-indigo-100">Choose a format, set your options and price, and compare what you keep on BooksAtlas with the other publishing platforms. No account needed.</p>
            </div>
            <aside className="w-full max-w-xs rounded-2xl bg-white/10 p-4 text-sm ring-1 ring-white/15 backdrop-blur">
              <p className="font-semibold">Questions about formats or a series?</p>
              <a href={enquiryHref('question')} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-amber-100"><Mail className="h-3.5 w-3.5" aria-hidden />Ask us: {OPERATOR.email}</a>
            </aside>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-6xl px-4 pb-16 sm:px-6">
        {/* Product picker */}
        <ToggleGroup.Root type="single" value={product} onValueChange={(v) => v && setProduct(v as Product)} aria-label="Choose a format"
          className="relative z-10 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200 sm:grid-cols-4">
          {PRODUCTS.map(({ id, label: name, hint, icon: Icon }) => (
            <ToggleGroup.Item key={id} value={id}
              className="group flex items-center gap-3 rounded-xl border-2 border-transparent px-3 py-3 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=on]:border-indigo-600 data-[state=on]:bg-indigo-50 cursor-pointer">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-data-[state=on]:bg-indigo-600 group-data-[state=on]:text-white"><Icon className="h-5 w-5" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{name}</span>
                <span className="block truncate text-[11px] text-slate-500">{hint}</span>
              </span>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {product === 'ebook' && (
              <Section title="eBook price and sales">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={label}>Your price, VAT included (€)
                    <input className={field} type="number" min={0} step={0.5} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} />
                  </label>
                  <label className={label}>Where most readers live
                    <SelectBox className={field} value={vat} onChange={(e) => setVat(e.target.value)}>{VAT.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</SelectBox>
                  </label>
                </div>
                <div>
                  <div className="flex items-center justify-between"><span className={label}>Copies sold a month</span><span className="text-sm font-bold tabular-nums text-slate-900">{copies}</span></div>
                  <Slider.Root value={[copies]} min={1} max={500} step={1} onValueChange={([v]) => setCopies(v ?? 1)} className="relative mt-3 flex h-5 touch-none select-none items-center cursor-pointer">
                    <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-200"><Slider.Range className="absolute h-full rounded-full bg-indigo-600" /></Slider.Track>
                    <Slider.Thumb aria-label="Copies sold a month" className="block h-5 w-5 rounded-full bg-white shadow ring-2 ring-indigo-600 focus-visible:outline-none focus-visible:ring-4" />
                  </Slider.Root>
                </div>
                <div>
                  <span className={label}>Your plan</span>
                  <ToggleGroup.Root type="single" value={plan} onValueChange={(v) => v && setPlan(v as PlanId)} aria-label="Your plan" className="mt-1 grid grid-cols-2 gap-2">
                    {(['standard', 'pro'] as const).map((id) => (
                      <ToggleGroup.Item key={id} value={id} className="rounded-xl border border-slate-300 px-3 py-2.5 text-left outline-none data-[state=on]:border-indigo-600 data-[state=on]:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                        <span className="block text-sm font-bold text-slate-900">{PLANS[id].label}</span>
                        <span className="block text-[11px] text-slate-500">Keep {Math.round((1 - PLANS[id].commission) * 100)}%{PLANS[id].monthlyFee ? ` · ${euro(PLANS[id].monthlyFee)} a month` : ' · no monthly fee'}</span>
                      </ToggleGroup.Item>
                    ))}
                  </ToggleGroup.Root>
                  {proFrom !== null && <p className="mt-2 text-xs text-slate-500">At this price, Author Pro pays more from {proFrom} copies a month.</p>}
                </div>
              </Section>
            )}

            {product === 'audiobook' && (
              <Section title="Natural-voice audiobook">
                <p className="text-sm text-slate-600">We narrate your eBook in a natural studio voice and sell the audiobook next to it. You pay once for the narration; every sale then earns you 81%.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className={label}>Words in your book
                    <input className={field} type="number" min={1000} step={1000} value={words} onChange={(e) => setWords(Math.max(0, Number(e.target.value)))} />
                  </label>
                  <label className={label}>Audiobook price, VAT incl. (€)
                    <input className={field} type="number" min={0} step={0.5} value={audioPrice} onChange={(e) => setAudioPrice(Math.max(0, Number(e.target.value)))} />
                  </label>
                  <label className={label}>Where most listeners live
                    <SelectBox className={field} value={vat} onChange={(e) => setVat(e.target.value)}>{VAT.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</SelectBox>
                  </label>
                </div>
                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-slate-500">Narration, once</dt><dd className="font-bold text-slate-900">{euro(audio.narration)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Listening time</dt><dd className="font-bold text-slate-900">about {audio.hours} h</dd></div>
                  <div><dt className="text-xs text-slate-500">You earn per sale</dt><dd className="font-bold text-slate-900">{euro(audio.perSale)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Paid back after</dt><dd className="font-bold text-slate-900">{audio.paysBackAfter === null ? '—' : `${audio.paysBackAfter} sales`}</dd></div>
                </dl>
                <p className="text-xs text-slate-500">€24.99 up to 60,000 words, then €3.99 for every further 10,000 words, VAT included. Readers can also buy the eBook and audiobook together.</p>
              </Section>
            )}

            {(product === 'paperback' || product === 'hardcover') && (
              <Section title={`${binding === 'hardcover' ? 'Hardcover' : 'Paperback'}: size, paper and pages`}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className={label}>Trim size
                    <SelectBox className={field} value={trimSize} onChange={(e) => setTrimSize(e.target.value as TrimSizeId)}>{TRIM_SIZES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</SelectBox>
                  </label>
                  <label className={label}>Paper and ink
                    <SelectBox className={field} value={paper} onChange={(e) => setPaper(e.target.value as PaperId)}>{PAPERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</SelectBox>
                  </label>
                  <label className={label}>Pages after layout
                    <input className={field} type="number" min={24} max={800} value={pages || ''} onChange={(e) => setPages(Number(e.target.value))} />
                  </label>
                </div>
                <p className={`text-xs ${tooFew ? 'font-semibold text-rose-700' : 'text-slate-500'}`}>{binding === 'hardcover' ? 'Hardcovers take 75 to 550 pages.' : 'Paperbacks take 24 to 800 pages (Amazon KDP: up to 828 on white paper).'}</p>
                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-slate-500">Spine width</dt><dd className="font-bold text-slate-900">{spec.spineIn.toFixed(3)} in · {inchesToMm(spec.spineIn)} mm</dd></div>
                  <div><dt className="text-xs text-slate-500">Full cover with bleed</dt><dd className="font-bold text-slate-900">{spec.widthIn.toFixed(2)} × {spec.heightIn.toFixed(2)} in</dd></div>
                  <div><dt className="text-xs text-slate-500">At 300 dpi</dt><dd className="font-bold text-slate-900">{spec.widthPx} × {spec.heightPx} px</dd></div>
                  <div><dt className="text-xs text-slate-500">Spine text</dt><dd className="font-bold text-slate-900">{spec.spineTextAllowed ? 'Allowed' : 'Under 80 pages: no'}</dd></div>
                </dl>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className={label}>Where most readers live
                    <SelectBox className={field} value={vat} onChange={(e) => setVat(e.target.value)}>{VAT.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</SelectBox>
                  </label>
                  <label className={label}>Your list price, VAT incl. (€)
                    <input className={field} type="number" min={0} step={0.5} value={printPrice} onChange={(e) => setPrintPrice(Math.max(0, Number(e.target.value)))} />
                  </label>
                  <label className={label}>Printer's cost per copy (€)
                    <input className={field} type="number" min={0} step={0.01} placeholder="From the printer's calculator" value={printCost} onChange={(e) => setPrintCost(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                  </label>
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Look up the printing cost for these specs:</span>
                  <a className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline" href="https://kdp.amazon.com/en_US/help/topic/G201834340" target="_blank" rel="noreferrer">Amazon KDP printing costs<ExternalLink className="h-3 w-3" aria-hidden /></a>
                  <a className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline" href="https://www.lulu.com/pricing" target="_blank" rel="noreferrer">Lulu pricing calculator<ExternalLink className="h-3 w-3" aria-hidden /></a>
                </p>
                <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  BooksAtlas sells and ships your printed book itself: readers order it on your book page, each copy is printed when it is ordered and shipped to them, and you keep 81% of the price excluding VAT after printing. No stock and no upfront cost. You can still publish the same files on KDP or Lulu too.
                </p>
              </Section>
            )}

            {/* Comparison */}
            {product === 'ebook' && (
              <Section title="What you keep per sale, platform by platform" aside={<span className="shrink-0 self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Rates checked {RATES_CHECKED}</span>}>
                <p className="text-sm text-slate-600">Your {euro(price)} eBook, sold to a reader paying {vatPercent}% VAT ({euro(excludingVat(price, vatPercent))} excluding VAT):</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Earnings per eBook sale by platform</caption>
                    <thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="py-2 font-semibold">Platform</th><th className="py-2 font-semibold">Share</th><th className="whitespace-nowrap py-2 text-right font-semibold">You earn</th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={`border-b border-slate-100 align-top ${r.ours ? 'bg-indigo-50/60' : ''}`}>
                          <td className="py-2.5 pr-3">
                            <span className={`block font-semibold ${r.ours ? 'text-indigo-900' : 'text-slate-900'}`}>{r.name}{r.ours && <Check className="ml-1 inline h-3.5 w-3.5 text-indigo-600" aria-hidden />}</span>
                            <span className="block text-[11px] leading-snug text-slate-500">{r.note}{r.source && <> <a href={r.source} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 hover:underline">Source</a></>}</span>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-slate-700">{r.rate}</td>
                          <td className={`whitespace-nowrap py-2.5 text-right font-bold tabular-nums ${r.ours ? 'text-indigo-900' : 'text-slate-900'}`}>{euro(r.perSale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">Other platforms' figures are estimates from their published headline rates; their own terms decide what they pay. Lulu's bookstore share is before its own fees, and it reaches far fewer readers than the large stores. Amazon's delivery fee depends on your file size ({fileMb} MB here).
                  <label className="ml-1 inline-flex items-center gap-1">File size<input type="number" min={0} step={0.5} value={fileMb} onChange={(e) => setFileMb(Math.max(0, Number(e.target.value)))} className="w-16 rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px]" aria-label="eBook file size in MB" />MB</label>
                </p>
              </Section>
            )}
          </div>

          {/* Summary */}
          <aside aria-label="Summary" className="h-fit space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl bg-[linear-gradient(135deg,#232272,#4338ca)] p-5 text-white shadow-xl shadow-indigo-900/20">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">{PRODUCTS.find((p) => p.id === product)!.label}</p>
              {product === 'ebook' && (
                <div className="mt-3 space-y-4">
                  <Money value={euro(ours.perSale)} caption={`per sale on ${PLANS[plan].label}: ${ours.rate} of the price excluding VAT`} />
                  <div className="border-t border-white/15 pt-4">
                    <Money value={euro(month.net)} caption={`a month from ${copies} copies${PLANS[plan].monthlyFee ? `, after the ${euro(PLANS[plan].monthlyFee)} fee` : ''}`} />
                  </div>
                </div>
              )}
              {product === 'audiobook' && (
                <div className="mt-3 space-y-4">
                  <Money value={euro(audio.narration)} caption="narration, paid once (VAT included)" />
                  <div className="border-t border-white/15 pt-4"><Money value={euro(audio.perSale)} caption="per audiobook sale: 81% of the price excluding VAT" /></div>
                </div>
              )}
              {(product === 'paperback' || product === 'hardcover') && (
                <div className="mt-3 space-y-4">
                  <Money value={`from ${euro(PRINT_PACKAGES[0].price)}`} caption="print-ready files from BooksAtlas, once per book" />
                  <div className="border-t border-white/15 pt-4">
                    {printCost === ''
                      ? <p className="text-xs text-indigo-100">Enter the printer's cost per copy to see what each copy earns on BooksAtlas, KDP and Lulu.</p>
                      : (
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <div className="col-span-2"><dt className="text-[11px] text-indigo-100">Sold and shipped by BooksAtlas</dt><dd className="text-2xl font-bold">{euro(print.booksatlas)}</dd></div>
                          <div><dt className="text-[11px] text-indigo-100">KDP on Amazon</dt><dd className="text-xl font-bold">{euro(print.kdp)}</dd></div>
                          <div><dt className="text-[11px] text-indigo-100">Lulu Bookstore</dt><dd className="text-xl font-bold">{euro(print.lulu)}</dd></div>
                          <p className="col-span-2 text-[11px] text-indigo-100">per copy. BooksAtlas pays 81% of the price excluding VAT after printing; the reader pays delivery. KDP pays 60% of the price excluding VAT less printing (it pays nothing below {euro(print.kdpMinimumPrice)}); Lulu pays 80% of what remains after printing.</p>
                        </dl>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Included with BooksAtlas</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {['No setup, delivery or listing fee', 'Word and PDF converted to EPUB for you', 'Store-ready check before you publish', 'Readers pay with iDEAL, cards, Apple Pay and Google Pay', 'VAT invoices handled for every sale', 'Sales dashboard, CSV export and monthly statements'].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{t}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-2">
                {product === 'paperback' || product === 'hardcover' ? (
                  <>
                    {PRINT_PACKAGES.map((p) => (
                      <a key={p.id} href={enquiryHref(p.id)} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:border-indigo-300 hover:bg-indigo-50">
                        <span><span className="block font-semibold text-slate-900">{p.name}</span><span className="block text-[11px] text-slate-500">{p.body}</span></span>
                        <span className="shrink-0 font-bold text-slate-900">{euro(p.price)}</span>
                      </a>
                    ))}
                  </>
                ) : (
                  <a href={PUBLISH_HREF} className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm hover:bg-amber-300">
                    {product === 'audiobook' ? 'Publish your eBook, then add the audiobook' : 'Publish your eBook'}<ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
