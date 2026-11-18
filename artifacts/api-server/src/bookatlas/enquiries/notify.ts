import { logger } from '../../lib/logger.js';
import type { Enquiry } from './service.js';

const TOPIC: Record<string, string> = {
  start: 'Start a book', print: 'Print-ready files', premium: 'Premium with cover', ebook: 'Sell my eBook',
  audiobook: 'Audiobook', question: 'Question', help: 'Help',
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Who hears about new enquiries: ENQUIRY_NOTIFY_TO, else the owner's address. Empty means nobody (no email sent). */
export const enquiryRecipient = () => (process.env.ENQUIRY_NOTIFY_TO || process.env.BOOKATLAS_OWNER_EMAIL || '').trim();

/** The notice to the team. Reply-to is the visitor, so answering the email answers them. */
export function enquiryEmail(e: Enquiry, appUrl: string) {
  const what = TOPIC[e.topic] ?? e.topic;
  const details = [e.title && `“${e.title}”`, e.formats.join(', '), e.trimSize, e.paper && `${e.paper} paper`, e.pages && `${e.pages} pages`].filter(Boolean) as string[];
  return {
    subject: oneLine(`New book enquiry: ${what}${e.title ? ` – ${e.title}` : ''} (from ${e.name})`).slice(0, 200),
    reply_to: e.email,
    text: `${e.name} <${e.email}> · ${what}\n${details.join(' · ')}\n\n${e.message}\n\nReply to this email to answer, then mark it answered on the Publish page: ${appUrl}/user-portal?view=publish`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px;margin:auto;padding:16px">
<p style="color:#64748b;font-size:12px">New book enquiry on BooksAtlas · ${esc(what)}</p>
<p style="margin:4px 0"><strong>${esc(e.name)}</strong> · ${esc(e.email)}</p>
${details.length ? `<p style="margin:4px 0;color:#334155">${esc(details.join(' · '))}</p>` : ''}
<p style="white-space:pre-wrap;line-height:1.5;border-left:3px solid #f59e0b;padding-left:12px">${esc(e.message)}</p>
<p style="color:#64748b;font-size:12px">Reply to this email to answer ${esc(e.name)}, then mark it answered on the <a href="${esc(appUrl)}/user-portal?view=publish">Publish page</a>.</p>
</body></html>`,
  };
}

/** Email the team about a new enquiry through Resend, when it is set up. Never throws; the enquiry is already saved. */
export async function notifyTeam(e: Enquiry, appUrl: string): Promise<boolean> {
  const to = enquiryRecipient();
  const from = process.env.EMAIL_FROM?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!to || !from || !apiKey) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], ...enquiryEmail(e, appUrl) }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) logger.warn({ status: res.status, event: 'enquiry.notify_rejected', id: e.id }, 'Enquiry notice rejected by Resend');
    return res.ok;
  } catch (err) {
    logger.warn({ err, event: 'enquiry.notify_failed', id: e.id }, 'Enquiry notice could not be sent');
    return false;
  }
}
