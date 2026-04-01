'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import type { Order } from '@/types';

function fmt(v: unknown): string {
    const n = Number(v);
    return isNaN(n) ? '0.00' : n.toFixed(2);
}

interface Props {
    order: Order;
    onClose: () => void;
    showToast?: (msg: string) => void;
}

export default function OrderDetailModal({ order: d, onClose, showToast }: Props) {
    const isFailed = d.tracking_id === 'FAILED';
    const isProcessing = d.tracking_id === 'PROCESSING';
    const hasTracking = !isFailed && !isProcessing;

    function copy(text: string) {
        navigator.clipboard.writeText(text).then(() => showToast?.('📋 Copied!'));
    }

    return (
        <Modal open title="" onClose={onClose} width={600}>
            {/* ── Hero header ── */}
            <div className={`-mx-8 -mt-8 mb-6 px-8 pt-8 pb-6 rounded-t-3xl ${isFailed
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : isProcessing
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700'
                }`}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Waybill</p>
                        {isFailed && (
                            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-sm font-black">
                                ❌ FAILED
                            </span>
                        )}
                        {isProcessing && (
                            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-sm font-black">
                                ⏳ PROCESSING
                            </span>
                        )}
                        {hasTracking && (
                            <div className="flex items-center gap-2">
                                <code className="text-white font-black text-lg tracking-wider break-all">{d.tracking_id}</code>
                                <button
                                    onClick={() => copy(d.tracking_id)}
                                    className="shrink-0 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs flex items-center justify-center transition-colors"
                                    title="Copy"
                                >📋</button>
                            </div>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Cost</p>
                        <p className="text-3xl font-black text-white drop-shadow">${fmt(d.price)}</p>
                    </div>
                </div>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        📦 {d.service || 'N/A'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        ⚖️ {Number(d.weight || 0).toFixed(2)} lbs
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        📐 {d.length}" × {d.width}" × {d.height}"
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        🕐 {d.created_at}
                    </span>
                </div>
            </div>

            {/* ── Error alert ── */}
            {isFailed && d.raw_response ? (
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
                    <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                    <div>
                        <div className="text-xs text-red-500 font-black uppercase tracking-wider mb-1">Reason for failure</div>
                        <p className="text-red-700 text-sm font-medium break-words leading-relaxed">
                            {String(
                                (d.raw_response as Record<string, unknown>)?.message ||
                                (d.raw_response as Record<string, unknown>)?.error ||
                                JSON.stringify(d.raw_response)
                            )}
                        </p>
                    </div>
                </div>
            ) : null}

            {/* ── Route card ── */}
            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 rounded-2xl p-5 mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Route</p>
                <div className="flex items-stretch gap-0">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">A</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Sender</span>
                        </div>
                        <div className="font-black text-slate-800 text-sm leading-tight mb-1">{d.from_name || '—'}</div>
                        <div className="text-xs text-slate-500 leading-relaxed">
                            {d.from_address && <div>{d.from_address}</div>}
                            <div>{[d.from_city, d.from_state, d.from_zip].filter(Boolean).join(', ') || '—'}</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4 shrink-0">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-px h-5 bg-slate-300" />
                            <div className="w-7 h-7 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-slate-400 text-sm font-black">→</div>
                            <div className="w-px h-5 bg-slate-300" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">B</span>
                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Recipient</span>
                        </div>
                        <div className="font-black text-slate-800 text-sm leading-tight mb-1">{d.to_name || '—'}</div>
                        <div className="text-xs text-slate-500 leading-relaxed">
                            {d.to_address && <div>{d.to_address}</div>}
                            <div>{[d.to_city, d.to_state, d.to_zip].filter(Boolean).join(', ') || '—'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PDF Actions ── */}
            {d.pdf ? (
                <div className="flex gap-3">
                    <a
                        href={d.pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
                    >
                        🖨️ Print PDF Label
                    </a>
                    <button
                        onClick={() => { const a = document.createElement('a'); a.href = d.pdf; a.download = 'label.pdf'; a.click(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-2xl text-sm font-black transition-all active:scale-[0.98] shadow-sm"
                    >
                        ⬇️ Download
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 font-medium">
                    No label file
                </div>
            )}
        </Modal>
    );
}