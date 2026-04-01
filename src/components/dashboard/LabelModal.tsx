'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';

interface Props {
  open: boolean;
  onClose: () => void;
  d: Record<string, unknown>;
  price: number;
  serviceName: string;
}

export default function LabelModal({ open, onClose, d, price, serviceName }: Props) {
  const { showToast, setActiveTab } = useApp();
  const pdf = d.pdf_url as string | undefined || d.pdf as string | undefined;
  const tracking = d.tracking_id as string | undefined;
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [open]);

  function copyTracking() {
    if (!tracking) return;
    navigator.clipboard.writeText(tracking).then(() => {
      setCopied(true);
      showToast('📋 Tracking ID copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadPDF() {
    if (!pdf) return showToast('⚠️ No PDF link available');
    const a = document.createElement('a');
    a.href = pdf; a.target = '_blank'; a.download = 'label.pdf';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.4)] overflow-hidden border border-white/20">

          {/* ── Hero ── */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-8 pt-10 pb-8 text-center overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-emerald-300/20 blur-xl" />

            {/* Animated check */}
            <div className="relative inline-flex mb-4">
              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                <svg viewBox="0 0 52 52" className="w-10 h-10" fill="none">
                  <circle cx="26" cy="26" r="25" stroke="white" strokeWidth="2" className="opacity-30" />
                  <path
                    d="M14 26 L22 34 L38 18"
                    stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      strokeDasharray: 30,
                      strokeDashoffset: visible ? 0 : 30,
                      transition: 'stroke-dashoffset 0.5s ease 0.2s',
                    }}
                  />
                </svg>
              </div>
              {/* Ping pulse */}
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Label Created Successfully!</h2>
            <p className="text-emerald-100 text-sm font-medium">Order saved and payment processed automatically</p>

            {/* Price badge */}
            <div className="inline-flex items-center gap-2 mt-5 bg-white/20 border border-white/30 backdrop-blur-sm px-5 py-2.5 rounded-2xl">
              <span className="text-white/70 text-sm font-semibold">Charged</span>
              <span className="text-white text-2xl font-black">${price.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-7 py-6 space-y-4">

            {/* Tracking ID */}
            {tracking && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tracking ID</div>
                <div className="flex items-center justify-between gap-3">
                  <code className="font-black text-indigo-700 text-base tracking-wider break-all flex-1">{tracking}</code>
                  <button
                    onClick={copyTracking}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      copied
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                    }`}
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Info rows */}
            <div className="space-y-0 divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
              {[
                { icon: '📦', label: 'Service', value: serviceName },
                { icon: '📤', label: 'From', value: String(d.fromName || d.from_name || '—') },
                { icon: '📥', label: 'To', value: String(d.toName || d.to_name || '—') },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-white text-sm">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <span>{row.icon}</span> {row.label}
                  </span>
                  <span className="font-bold text-slate-700 text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {/* PDF section */}
            {pdf ? (
              <div className="flex gap-2.5">
                <a
                  href={pdf} target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
                >
                  🖨️ Open / Print PDF
                </a>
                <button
                  onClick={downloadPDF}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-black transition-all active:scale-[0.98] shadow-sm"
                >
                  ⬇️ Download
                </button>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-amber-700 text-sm font-medium">
                ⚠️ PDF link not found. Please check in the Orders tab.
              </div>
            )}

            {/* Footer action */}
            <button
              onClick={() => { handleClose(); setActiveTab('orders'); }}
              className="w-full py-3 text-slate-500 hover:text-indigo-600 text-sm font-semibold transition-colors"
            >
              📋 View in order history →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
