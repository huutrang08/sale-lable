'use client';

import React, { ReactNode, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

// ── Modal ──────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 500 }: {
  open: boolean; onClose: () => void; title: string;
  children: ReactNode; width?: number;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50 overflow-y-auto animate-slide-up"
        style={{ width: `min(${width}px, 95vw)`, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
          <h3 className="text-xl font-extrabold text-slate-800 mb-6 tracking-tight">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 justify-end mt-8">{children}</div>;
}

// ── Badge ──────────────────────────────────────────────
const badgeStyles: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
};
export function Badge({ variant, children }: { variant: keyof typeof badgeStyles; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyles[variant]}`}>
      {children}
    </span>
  );
}

// ── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-[2.5px] border-slate-200 border-t-blue-600 animate-spin align-middle"
      style={{ width: size, height: size }}
    />
  );
}

// ── Toast ───────────────────────────────────────────────
export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed bottom-8 right-8 z-[99999] bg-slate-800/95 backdrop-blur text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/20 text-sm font-medium animate-slide-up flex items-center gap-3 border border-slate-700/50">
      {toast}
    </div>
  );
}

// ── Alert Msg ───────────────────────────────────────────
const alertStyles: Record<string, string> = {
  error: 'bg-rose-50/80 text-rose-800 border-rose-200/60 shadow-sm shadow-rose-100',
  success: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60 shadow-sm shadow-emerald-100',
  info: 'bg-blue-50/80 text-blue-800 border-blue-200/60 shadow-sm shadow-blue-100',
};
export function Alert({ type, children }: { type: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div className={`px-5 py-3.5 rounded-2xl text-sm font-medium mb-5 border backdrop-blur-sm ${alertStyles[type]}`}>
      {children}
    </div>
  );
}

// ── Button variants ─────────────────────────────────────
export function Btn({ onClick, disabled, className = '', children, type = 'button' }: {
  onClick?: () => void; disabled?: boolean; className?: string;
  children: ReactNode; type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

// ── Form field ──────────────────────────────────────────
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = 'w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 placeholder:text-slate-400 font-medium';
export const selectCls = inputCls;

// ── Card ────────────────────────────────────────────────
export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`glass-card h-full p-7 mb-6 ${className}`}>
      {title && <h2 className="text-lg font-extrabold text-slate-800 tracking-tight mb-5">{title}</h2>}
      {children}
    </div>
  );
}

// ── KeyBadge ────────────────────────────────────────────
export function KeyBadge({ children, blue }: { children: ReactNode; blue?: boolean }) {
  return (
    <code className={`font-mono px-2 py-1 rounded-md text-xs font-bold ${blue ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20' : 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20'}`}>
      {children}
    </code>
  );
}
