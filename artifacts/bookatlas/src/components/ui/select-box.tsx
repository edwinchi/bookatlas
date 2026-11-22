import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Radix replacements for the browser's own <select> and checkbox (owner request 2026-11-22: "the best of Radix
 * across the application"). They take the same props and children as the native elements — <option> and <optgroup>
 * children, `value`/`onChange(e)` with `e.target.value` / `e.target.checked` — so a form only swaps the tag, and they
 * still submit with a plain <form> when given a `name`. Their pop-ups open in the full-screen element when there is
 * one (the reader), otherwise in the page.
 */

const EMPTY = '__ba_empty__';
const toRadix = (v: unknown) => (v === undefined || v === null ? undefined : String(v) === '' ? EMPTY : String(v));
const fromRadix = (v: string) => (v === EMPTY ? '' : v);
const portalTarget = () => (typeof document !== 'undefined' ? (document.fullscreenElement as HTMLElement | null) ?? undefined : undefined);

type Opt = { value: string; label: React.ReactNode; text: string; disabled?: boolean };
type Group = { label?: string; options: Opt[] };

const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return '';
};

function collect(children: React.ReactNode): Group[] {
  const groups: Group[] = [];
  let loose: Group | null = null;
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement<Record<string, any>>(child)) return;
      if (child.type === React.Fragment) { walk(child.props.children); return; }
      if (child.type === 'optgroup') {
        const g: Group = { label: child.props.label, options: [] };
        React.Children.forEach(child.props.children, (o) => {
          if (React.isValidElement<Record<string, any>>(o) && o.type === 'option') g.options.push(optionOf(o.props));
        });
        groups.push(g);
        loose = null;
        return;
      }
      if (child.type === 'option') {
        if (!loose) { loose = { options: [] }; groups.push(loose); }
        loose.options.push(optionOf(child.props));
      }
    });
  };
  walk(children);
  return groups;
}
const optionOf = (p: Record<string, any>): Opt => {
  const text = textOf(p.children);
  return { value: p.value !== undefined ? String(p.value) : text, label: p.children, text, disabled: !!p.disabled };
};

type ChangeLike = { target: { value: string; name?: string }; currentTarget: { value: string; name?: string } };

export interface SelectBoxProps {
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (e: ChangeLike) => void;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  title?: string;
  placeholder?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

export function SelectBox({
  value, defaultValue, onChange, children, className, id, name, required, disabled, title, placeholder, ...aria
}: SelectBoxProps) {
  const groups = React.useMemo(() => collect(children), [children]);
  const all = groups.flatMap((g) => g.options);
  // A native select shows its first option when no value matches; do the same.
  const fallback = all[0]?.value;
  const controlled = value !== undefined;
  const current = controlled ? toRadix(value) : undefined;
  const shown = controlled && current !== undefined && !all.some((o) => toRadix(o.value) === current) ? toRadix(fallback) : current;
  return (
    <SelectPrimitive.Root
      value={controlled ? shown : undefined}
      defaultValue={controlled ? undefined : toRadix(defaultValue ?? fallback)}
      onValueChange={(v) => { const val = fromRadix(v); onChange?.({ target: { value: val, name }, currentTarget: { value: val, name } }); }}
      name={name} required={required} disabled={disabled}>
      <SelectPrimitive.Trigger id={id} title={title} {...aria}
        className={cn('inline-flex items-center justify-between gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', className)}>
        <span className="min-w-0 truncate"><SelectPrimitive.Value placeholder={placeholder} /></span>
        <SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={portalTarget()}>
        <SelectPrimitive.Content position="popper" sideOffset={4} collisionPadding={8}
          className="z-[200] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl bg-white text-sm text-slate-900 shadow-xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in">
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-slate-500"><ChevronUp className="h-4 w-4" /></SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {groups.map((g, gi) => (
              <SelectPrimitive.Group key={gi}>
                {g.label && <SelectPrimitive.Label className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{g.label}</SelectPrimitive.Label>}
                {g.options.map((o) => (
                  <SelectPrimitive.Item key={o.value} value={toRadix(o.value)!} disabled={o.disabled} textValue={o.text}
                    className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-900 data-[state=checked]:font-semibold">
                    <SelectPrimitive.ItemIndicator className="absolute left-2.5 inline-flex items-center"><Check className="h-4 w-4 text-indigo-600" /></SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-slate-500"><ChevronDown className="h-4 w-4" /></SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

type CheckLike = { target: { checked: boolean; name?: string; value?: string }; currentTarget: { checked: boolean; name?: string; value?: string } };

export interface CheckBoxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: CheckLike) => void;
  className?: string;
  id?: string;
  name?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/** Radix checkbox with the native checkbox's props (`checked`, `onChange(e)` with `e.target.checked`). */
export function CheckBox({ checked, defaultChecked, onChange, className, name, value, ...rest }: CheckBoxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked} defaultChecked={defaultChecked} name={name} value={value}
      onCheckedChange={(c) => { const v = c === true; onChange?.({ target: { checked: v, name, value }, currentTarget: { checked: v, name, value } }); }}
      {...rest}
      className={cn('peer inline-grid h-4 w-4 shrink-0 place-items-center rounded border border-slate-400 bg-white align-middle text-white transition-colors cursor-pointer data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50', className)}>
      <CheckboxPrimitive.Indicator><Check className="h-3 w-3" strokeWidth={3} /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
