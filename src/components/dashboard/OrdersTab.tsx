'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, Modal, Spinner } from '@/components/ui';
import type { Order } from '@/types';

function fmt(v: unknown): string {
  const n = Number(v);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

export default function OrdersTab() {
  const { currentUser, showToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [currentUser]);

  async function load() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch {
      showToast('Lỗi tải dữ liệu đơn hàng');
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast('📋 Đã sao chép!'));
  }

  const filtered = orders.filter(o => !search ||
    o.tracking_id?.toLowerCase().includes(search.toLowerCase()) ||
    o.to_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.from_name?.toLowerCase().includes(search.toLowerCase())
  );

  function StatusBadge({ id }: { id: string }) {
    if (id === 'FAILED') return <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-md text-xs font-bold">❌ LỖI</span>;
    if (id === 'PROCESSING') return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-md text-xs font-bold">⏳ XỬ LÝ</span>;
    return <code className="text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-xs break-all">{id}</code>;
  }

  return (
    <Card title="📦 Lịch sử giao dịch" className="p-0 sm:p-0">
      {/* Toolbar */}
      <div className="p-5 border-b border-slate-100 flex gap-3 flex-col sm:flex-row items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tracking, tên..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium" />
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50">
          {loading ? <Spinner size={14} /> : '🔄'} Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="px-5 py-3.5 hidden sm:table-cell w-8">#</th>
              <th className="px-5 py-3.5">Tracking & Ngày</th>
              <th className="px-5 py-3.5">Tuyến đường</th>
              <th className="px-5 py-3.5 hidden md:table-cell">Dịch vụ</th>
              <th className="px-5 py-3.5 text-right">Cước</th>
              <th className="px-5 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr><td colSpan={6} className="py-14 text-center text-slate-400"><Spinner size={24} /></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-14 text-center text-slate-400 font-medium">Chưa có đơn hàng nào.</td></tr>
            )}
            {!loading && filtered.map((o, i) => (
              <tr key={o.id} className="hover:bg-slate-50/80 transition-colors group align-middle">
                {/* # */}
                <td className="px-5 py-4 text-slate-400 text-xs hidden sm:table-cell">{i + 1}</td>

                {/* Tracking + Date */}
                <td className="px-5 py-4 min-w-[150px]">
                  <StatusBadge id={o.tracking_id} />
                  <div className="text-[11px] text-slate-400 mt-1">{o.created_at}</div>
                  {o.tracking_id && o.tracking_id !== 'FAILED' && o.tracking_id !== 'PROCESSING' && (
                    <button onClick={() => copy(o.tracking_id)}
                      className="mt-1 text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                      📋 Sao chép
                    </button>
                  )}
                </td>

                {/* Route */}
                <td className="px-5 py-4 min-w-[200px]">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400 font-semibold mb-0.5">GỬI</div>
                      <div className="font-bold text-slate-700 text-sm truncate">{o.from_name || '—'}</div>
                      <div className="text-xs text-slate-500 truncate">{[o.from_city, o.from_state, o.from_zip].filter(Boolean).join(', ')}</div>
                    </div>
                    <div className="text-slate-300 text-base font-black pt-4">→</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400 font-semibold mb-0.5">NHẬN</div>
                      <div className="font-bold text-slate-700 text-sm truncate">{o.to_name || '—'}</div>
                      <div className="text-xs text-slate-500 truncate">{[o.to_city, o.to_state, o.to_zip].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                </td>

                {/* Service */}
                <td className="px-5 py-4 hidden md:table-cell">
                  <div className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block max-w-[160px] truncate">{o.service || '—'}</div>
                  <div className="text-xs text-slate-500 mt-1">⚖️ {Number(o.weight || 0).toFixed(1)} lbs</div>
                </td>

                {/* Price */}
                <td className="px-5 py-4 text-right">
                  <span className="font-black text-emerald-600 text-sm">${fmt(o.price)}</span>
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {o.pdf && (
                      <a href={o.pdf} target="_blank" rel="noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors text-sm" title="In nhãn">
                        🖨️
                      </a>
                    )}
                    <button onClick={() => setDetail(o)}
                      className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors text-sm" title="Chi tiết">
                      🔍
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (() => {
        const d = detail;
        const isFailed = d.tracking_id === 'FAILED';
        const isProcessing = d.tracking_id === 'PROCESSING';
        const hasTracking = !isFailed && !isProcessing;
        return (
          <Modal open title="" onClose={() => setDetail(null)} width={600}>
            {/* ── Hero header ── */}
            <div className={`-mx-8 -mt-8 mb-6 px-8 pt-8 pb-6 rounded-t-3xl ${isFailed ? 'bg-gradient-to-br from-red-500 to-rose-600' : isProcessing ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Vận đơn</p>
                  {isFailed ? <span className="inline-flex items-center gap-1.5 bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-sm font-black">❌ THẤT BẠI</span> : null}
                  {isProcessing ? <span className="inline-flex items-center gap-1.5 bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-sm font-black">⏳ ĐANG XỬ LÝ</span> : null}
                  {hasTracking ? (
                    <div className="flex items-center gap-2">
                      <code className="text-white font-black text-lg tracking-wider break-all">{d.tracking_id}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(d.tracking_id).then(() => { })}
                        className="shrink-0 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs flex items-center justify-center transition-colors"
                        title="Sao chép"
                      >📋</button>
                    </div>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Cước phí</p>
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
            {isFailed && d.raw_response && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
                <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                <div>
                  <div className="text-xs text-red-500 font-black uppercase tracking-wider mb-1">Lý do thất bại</div>
                  <p className="text-red-700 text-sm font-medium break-words leading-relaxed">
                    {String((d.raw_response as Record<string, unknown>)?.message || (d.raw_response as Record<string, unknown>)?.error || JSON.stringify(d.raw_response))}
                  </p>
                </div>
              </div>
            )}

            {/* ── Route card ── */}
            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 rounded-2xl p-5 mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Tuyến đường</p>
              <div className="flex items-stretch gap-0">
                {/* FROM */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">A</span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Người gửi</span>
                  </div>
                  <div className="font-black text-slate-800 text-sm leading-tight mb-1">{d.from_name || '—'}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    {d.from_address && <div>{d.from_address}</div>}
                    <div>{[d.from_city, d.from_state, d.from_zip].filter(Boolean).join(', ') || '—'}</div>
                  </div>
                </div>

                {/* Arrow connector */}
                <div className="flex flex-col items-center justify-center px-4 shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-5 bg-slate-300" />
                    <div className="w-7 h-7 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-slate-400 text-sm font-black">→</div>
                    <div className="w-px h-5 bg-slate-300" />
                  </div>
                </div>

                {/* TO */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">B</span>
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Người nhận</span>
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
                <a href={d.pdf} target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]">
                  🖨️ In nhãn PDF
                </a>
                <button
                  onClick={() => { const a = document.createElement('a'); a.href = d.pdf; a.download = 'label.pdf'; a.click(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-2xl text-sm font-black transition-all active:scale-[0.98] shadow-sm">
                  ⬇️ Tải xuống
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 font-medium">
                Không có file nhãn
              </div>
            )}
          </Modal>
        );
      })()}
    </Card>
  );
}
