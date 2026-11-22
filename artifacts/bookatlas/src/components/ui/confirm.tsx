import * as React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

type Ask = { title: string; body?: string; action?: string; destructive?: boolean };

/**
 * A Radix confirmation window in place of the browser's own `window.confirm` (owner request 2026-11-22), which
 * looks foreign, cannot be styled and is blocked inside some embedded views. `await confirm({...})` resolves true
 * when the reader agrees. Render `dialog` once in the component.
 */
export function useConfirm() {
  const [ask, setAsk] = React.useState<(Ask & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = React.useCallback((a: Ask) => new Promise<boolean>((resolve) => setAsk({ ...a, resolve })), []);
  const close = (ok: boolean) => { ask?.resolve(ok); setAsk(null); };
  const container = typeof document !== 'undefined' ? (document.fullscreenElement as HTMLElement | null) ?? undefined : undefined;
  const dialog = (
    <AlertDialog.Root open={!!ask} onOpenChange={(open) => { if (!open) close(false); }}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className="fixed inset-0 z-[150] bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[151] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in focus-visible:outline-none">
          <AlertDialog.Title className="text-base font-bold">{ask?.title}</AlertDialog.Title>
          {ask?.body
            ? <AlertDialog.Description className="mt-1.5 text-sm text-slate-600">{ask.body}</AlertDialog.Description>
            : <AlertDialog.Description className="sr-only">{ask?.title}</AlertDialog.Description>}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onClick={() => close(true)}
              className={`rounded-lg px-3.5 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer ${ask?.destructive ? 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500' : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-500'}`}>
              {ask?.action ?? 'OK'}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
  return { confirm, dialog };
}
