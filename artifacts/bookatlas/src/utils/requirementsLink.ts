/**
 * Opening "What a complete book needs" on the Publish page at a given tab, from a menu (owner request 2026-11-25:
 * Products → Printed books shows the Amazon KDP and Lulu guides). The Publish page loads on demand and asks visitors
 * to sign in first, so the request is also kept in this tab's session storage for 30 minutes and taken once the page
 * has mounted, after sign-in if need be.
 */
export type RequirementsTab = 'ebook' | 'print' | 'amazon' | 'lulu';
export const REQUIREMENTS_EVENT = 'bookatlas:requirements';
const KEY = 'bookatlas:requirements';
const TABS: RequirementsTab[] = ['ebook', 'print', 'amazon', 'lulu'];

let pending: RequirementsTab | null = null;

export function showRequirements(tab: RequirementsTab) {
  pending = tab;
  try { sessionStorage.setItem(KEY, JSON.stringify({ tab, at: Date.now() })); } catch { /* storage blocked: this page load still works */ }
  window.dispatchEvent(new CustomEvent(REQUIREMENTS_EVENT));
}

export function takeRequestedRequirements(now = Date.now()): RequirementsTab | null {
  let tab = pending;
  pending = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { tab?: string; at?: number } | null;
    sessionStorage.removeItem(KEY);
    if (!tab && saved && TABS.includes(saved.tab as RequirementsTab) && now - (saved.at ?? 0) < 30 * 60_000) tab = saved.tab as RequirementsTab;
  } catch { /* storage blocked */ }
  return tab;
}
