'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Modal, Btn, ModalActions, Field, inputCls, Alert } from '@/components/ui';

interface PaymentMethod {
  id: number;
  name: string;
  address: string;
  qr_base64: string | null;
  is_active: boolean;
}

const EMPTY = { id: 0, name: '', address: '', qr_base64: null as string | null, is_active: true };

/* ─────────────────────────────────────────
   Read-only card shown to regular users
───────────────────────────────────────── */
function UserPaymentCard({ m, onPreview }: { m: PaymentMethod; onPreview: (src: string) => void }) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(m.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative bg-white rounded-3xl border border-indigo-100 shadow-sm shadow-indigo-100 overflow-hidden">
      {/* top stripe */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />

      <div className="p-6">
        {/* QR */}
        {m.qr_base64 ? (
          <button
            onClick={() => onPreview(m.qr_base64!)}
            className="w-full mb-5 group relative"
          >
            <img
              src={m.qr_base64}
              alt="QR Code"
              className="w-full h-44 object-contain bg-slate-50 border border-slate-100 rounded-2xl group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-all bg-black/8">
              <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-xl">🔍 Phóng to</span>
            </div>
          </button>
        ) : (
          <div className="w-full h-44 mb-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
            <span className="text-5xl">🔳</span>
          </div>
        )}

        {/* Name */}
        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Phương thức</div>
        <div className="font-black text-slate-800 text-lg mb-4">{m.name}</div>

        {/* Address + copy */}
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Địa chỉ thanh toán</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 break-all">
            {m.address}
          </div>
          <button
            onClick={copyAddress}
            title="Sao chép"
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border text-sm font-bold transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-indigo-50 border-indigo-100 text-indigo-500 hover:bg-indigo-100'
            }`}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function PaymentTab({ isAdmin = false }: { isAdmin?: boolean }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<typeof EMPTY>(EMPTY);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-methods');
      const json = await res.json();
      if (json.success) {
        // users only see active ones
        setMethods(isAdmin ? json.data : json.data.filter((m: PaymentMethod) => m.is_active));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(EMPTY); setMsg(null); setModal(true); }
  function openEdit(m: PaymentMethod) {
    setEditing({ id: m.id, name: m.name, address: m.address, qr_base64: m.qr_base64, is_active: m.is_active });
    setMsg(null); setModal(true);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setMsg({ text: '⚠️ Ảnh phải nhỏ hơn 2MB', type: 'error' });
    const reader = new FileReader();
    reader.onload = () => setEditing(p => ({ ...p, qr_base64: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!editing.name.trim() || !editing.address.trim())
      return setMsg({ text: '⚠️ Vui lòng điền tên và địa chỉ thanh toán', type: 'error' });
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: editing.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (json.success) { setMsg({ text: '✅ Lưu thành công!', type: 'success' }); setTimeout(() => { setModal(false); load(); }, 700); }
      else setMsg({ text: '❌ ' + json.message, type: 'error' });
    } catch { setMsg({ text: '❌ Lỗi kết nối mạng', type: 'error' }); }
    setSaving(false);
  }

  async function toggleActive(m: PaymentMethod) {
    await fetch('/api/admin/payment-methods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, is_active: !m.is_active }) });
    load();
  }

  async function del(id: number) {
    if (!confirm('Xác nhận xóa phương thức thanh toán này?')) return;
    await fetch(`/api/admin/payment-methods?id=${id}`, { method: 'DELETE' });
    load();
  }

  /* ── USER VIEW ── */
  if (!isAdmin) {
    return (
      <>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white rounded-3xl p-8 mb-8 shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)]">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-400/15 blur-2xl" />
            <div className="relative z-10">
              <div className="text-indigo-200 text-sm font-semibold mb-1">Nạp tiền vào tài khoản</div>
              <h1 className="text-2xl font-black tracking-tight mb-2">Thông tin thanh toán</h1>
              <p className="text-indigo-200 text-sm leading-relaxed max-w-sm">
                Chuyển khoản theo thông tin bên dưới. Sau khi chuyển, liên hệ admin để được cộng số dư.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <span className="text-3xl animate-spin">⏳</span>
              <span className="text-sm font-semibold">Đang tải thông tin thanh toán...</span>
            </div>
          ) : methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100">
              <span className="text-5xl mb-3">💳</span>
              <p className="font-semibold">Chưa có phương thức thanh toán nào</p>
              <p className="text-sm mt-1 text-slate-300">Vui lòng liên hệ admin</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {methods.map(m => (
                <UserPaymentCard key={m.id} m={m} onPreview={setPreviewOpen} />
              ))}
            </div>
          )}
        </div>

        {/* QR Preview */}
        {previewOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setPreviewOpen(null)}>
            <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <img src={previewOpen} alt="QR Full" className="w-full rounded-2xl" />
              <button onClick={() => setPreviewOpen(null)} className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors">Đóng</button>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ── ADMIN VIEW ── */
  return (
    <>
      <Card title="💳 Quản lý phương thức thanh toán">
        <div className="flex gap-2.5 mb-6">
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-95">
            ➕ Thêm phương thức
          </button>
          <button onClick={load} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            🔄 Làm mới
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <span className="animate-spin text-lg">⏳</span> Đang tải...
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-5xl mb-3">💳</span>
            <p className="font-semibold">Chưa có phương thức thanh toán nào</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {methods.map(m => (
              <div key={m.id} className={`relative rounded-2xl border overflow-hidden transition-all ${m.is_active ? 'border-indigo-200 shadow-sm shadow-indigo-100' : 'border-slate-200 opacity-60'}`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${m.is_active ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-200'}`} />
                <div className="p-5 pt-6">
                  {m.qr_base64 ? (
                    <button onClick={() => setPreviewOpen(m.qr_base64!)} className="w-full mb-4 group relative">
                      <img src={m.qr_base64} alt="QR" className="w-full h-36 object-contain bg-white border border-slate-100 rounded-xl group-hover:ring-2 group-hover:ring-indigo-400 transition-all" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl flex items-center justify-center transition-all">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg">🔍 Xem to</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-36 mb-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
                      <span className="text-4xl">🔳</span>
                    </div>
                  )}
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">Phương thức</div>
                  <div className="font-black text-slate-800 text-base mb-3">{m.name}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Địa chỉ</div>
                  <div className="font-mono text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 break-all mb-1">
                    {m.address}
                  </div>
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${m.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {m.is_active ? 'Đang hiển thị' : 'Đang ẩn'}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openEdit(m)} className="flex-1 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">✏️ Sửa</button>
                    <button onClick={() => toggleActive(m)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${m.is_active ? 'text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
                      {m.is_active ? '🙈 Ẩn' : '👁️ Hiện'}
                    </button>
                    <button onClick={() => del(m.id)} className="py-1.5 px-3 text-xs font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit/Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing.id ? '✏️ Sửa phương thức' : '➕ Thêm phương thức'} width={480}>
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        <Field label="Phương thức thanh toán *">
          <input className={inputCls} placeholder="VD: Momo, USDT TRC20, Vietcombank..." value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label="Địa chỉ thanh toán *">
          <input className={inputCls} placeholder="Số điện thoại / số tài khoản / địa chỉ ví..." value={editing.address} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} />
        </Field>
        <Field label="Ảnh QR Code">
          <div onClick={() => fileRef.current?.click()} className="w-full cursor-pointer group border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl transition-all overflow-hidden bg-slate-50 hover:bg-indigo-50/30">
            {editing.qr_base64 ? (
              <div className="relative">
                <img src={editing.qr_base64} alt="QR Preview" className="w-full max-h-52 object-contain p-4" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-xl">🔄 Đổi ảnh</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <span className="text-4xl group-hover:scale-110 transition-transform">🔳</span>
                <span className="text-sm font-semibold">Nhấn để tải ảnh QR lên</span>
                <span className="text-xs text-slate-300">PNG, JPG — tối đa 2MB</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {editing.qr_base64 && <button onClick={() => setEditing(p => ({ ...p, qr_base64: null }))} className="mt-2 text-xs text-red-500 hover:underline">🗑️ Xóa ảnh QR</button>}
        </Field>
        {editing.id !== 0 && (
          <Field label="Trạng thái">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div onClick={() => setEditing(p => ({ ...p, is_active: !p.is_active }))} className={`relative w-11 h-6 rounded-full transition-colors ${editing.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editing.is_active ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-medium text-slate-600">{editing.is_active ? 'Đang hiển thị' : 'Đang ẩn'}</span>
            </label>
          </Field>
        )}
        <ModalActions>
          <Btn onClick={() => setModal(false)} className="border-[1.5px] border-slate-300 text-slate-600 hover:bg-slate-50">Hủy</Btn>
          <Btn onClick={save} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md shadow-indigo-500/20">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
          </Btn>
        </ModalActions>
      </Modal>

      {/* QR Preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={() => setPreviewOpen(null)}>
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={previewOpen} alt="QR Full" className="w-full rounded-2xl" />
            <button onClick={() => setPreviewOpen(null)} className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors">Đóng</button>
          </div>
        </div>
      )}
    </>
  );
}
