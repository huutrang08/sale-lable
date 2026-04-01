'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, Alert, Spinner, Field, Modal, inputCls } from '@/components/ui';
import type { ShipService, OrderPayload, Order } from '@/types';

const ADDR_FIELDS = ['fromName', 'fromCompany', 'fromAddress', 'fromAddress2', 'fromCity', 'fromState', 'fromZip', 'fromCountry'];
const PAGE_SIZE = 20;

type ZipParts = { left: string; right: string };

function ZipInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dash = value.indexOf('-');
  const initLeft = dash >= 0 ? value.slice(0, dash) : value;
  const initRight = dash >= 0 ? value.slice(dash + 1) : '';
  const [parts, setParts] = useState<ZipParts>({ left: initLeft, right: initRight });

  function update(next: ZipParts) {
    setParts(next);
    const combined = next.right ? `${next.left}-${next.right}` : next.left;
    onChange(combined);
  }

  return (
    <div className="flex items-center gap-1">
      <input
        className={inputCls + ' flex-1 min-w-0'}
        placeholder="12345"
        maxLength={10}
        value={parts.left}
        onChange={e => update({ ...parts, left: e.target.value })}
      />
      <span className="text-slate-400 font-bold shrink-0">-</span>
      <input
        className={inputCls + ' flex-1 min-w-0'}
        placeholder="6789 (opt)"
        maxLength={10}
        value={parts.right}
        onChange={e => update({ ...parts, right: e.target.value })}
      />
    </div>
  );
}

const SECTIONS: [string, string][] = [
  ['fromName', 'Name *'], ['fromCompany', 'Company'], ['fromAddress', 'Address *'],
  ['fromAddress2', 'Address 2'], ['fromCity', 'City *'], ['fromState', 'State *'],
  ['fromZip', 'ZIP *'], ['fromCountry', 'Country'],
];
const TO_SECTIONS: [string, string][] = [
  ['toName', 'Name *'], ['toCompany', 'Company'], ['toAddress', 'Address *'],
  ['toAddress2', 'Address 2'], ['toCity', 'City *'], ['toState', 'State *'],
  ['toZip', 'ZIP *'], ['toCountry', 'Country'],
];

function OrderSuccessModal({ d, onClose, showToast }: { d: any; onClose: () => void; showToast: (m: string) => void }) {
  const isFailed = d.tracking_id === 'FAILED';
  const isProcessing = d.tracking_id === 'PROCESSING';
  const hasTracking = !isFailed && !isProcessing;
  function fmt(v: unknown) { const n = Number(v); return isNaN(n) ? '0.00' : n.toFixed(2); }

  return (
    <Modal open title="" onClose={onClose} width={600}>
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 -mx-8 -mt-8 mb-6 px-8 pt-8 pb-6 rounded-t-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Waybill</p>
            {hasTracking && (
              <div className="flex items-center gap-2">
                <code className="text-white font-black text-lg tracking-wider break-all">{d.tracking_id}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(d.tracking_id).then(() => showToast('📋 Copied!'))}
                  className="shrink-0 w-7 h-7 rounded-lg text-white text-xs flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                >📋</button>
              </div>
            )}
            {isFailed && <span className="inline-flex items-center gap-1.5 text-white border border-white/30 px-3 py-1 rounded-full text-sm font-black" style={{ background: 'rgba(255,255,255,0.2)' }}>❌ FAILED</span>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Cost</p>
            <p className="text-3xl font-black text-white drop-shadow">${fmt(d.price)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-1 text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>📦 {d.service || 'N/A'}</span>
          <span className="inline-flex items-center gap-1 text-white/90 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>⚖️ {Number(d.weight || 0).toFixed(2)} lbs</span>
        </div>
      </div>

      {/* Route */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Route</p>
        <div className="flex items-stretch">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">A</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Sender</span>
            </div>
            <div className="font-black text-slate-800 text-sm leading-tight">{d.from_name || '—'}</div>
            <div className="text-xs text-slate-500">{[d.from_city, d.from_state, d.from_zip].filter(Boolean).join(', ') || '—'}</div>
          </div>
          <div className="flex flex-col items-center justify-center px-4 shrink-0">
            <div className="w-px h-5 bg-slate-300" />
            <div className="w-7 h-7 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-slate-400 text-sm font-black">→</div>
            <div className="w-px h-5 bg-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">B</span>
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Recipient</span>
            </div>
            <div className="font-black text-slate-800 text-sm leading-tight">{d.to_name || '—'}</div>
            <div className="text-xs text-slate-500">{[d.to_city, d.to_state, d.to_zip].filter(Boolean).join(', ') || '—'}</div>
          </div>
        </div>
      </div>

      {/* PDF */}
      {d.pdf ? (
        <div className="flex gap-3">
          <a href={d.pdf} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl text-sm font-black shadow-lg transition-all active:scale-[0.98]">
            🖨️ Print PDF Label
          </a>
          <button
            onClick={() => { const a = document.createElement('a'); a.href = d.pdf; a.download = 'label.pdf'; a.click(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-2xl text-sm font-black transition-all active:scale-[0.98] shadow-sm">
            ⬇️ Download
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-sm text-slate-400">No label file</div>
      )}
    </Modal>
  );
}

export default function CreateTab() {
  const { currentUser, services, setServices, selectedService, setSelectedService, updateBalance, showToast } = useApp();
  const [loadingSvc, setLoadingSvc] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [svcPage, setSvcPage] = useState(1);

  const [form, setForm] = useState<Record<string, string>>({
    fromName: '', fromCompany: '', fromAddress: '', fromAddress2: '',
    fromCity: '', fromState: '', fromZip: '', fromCountry: 'US',
    toName: '', toCompany: '', toAddress: '', toAddress2: '',
    toCity: '', toState: '', toZip: '', toCountry: 'US',
    weight: '', length: '', width: '', height: '', ref1: '', ref2: '', desc: '',
  });

  const [saveAddr, setSaveAddr] = useState(false);
  const saveAddrRef = useRef(false);

  const addrKey = currentUser ? `saved_from_addr_${currentUser.username}` : null;

  const totalSvcPages = Math.ceil(services.length / PAGE_SIZE);
  const pagedServices = services.slice((svcPage - 1) * PAGE_SIZE, svcPage * PAGE_SIZE);

  useEffect(() => {
    if (!currentUser) return;
    loadServices();
    const key = `saved_from_addr_${currentUser.username}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        saveAddrRef.current = true;
        setSaveAddr(true);
        setForm(p => ({ ...p, ...saved }));
      }
    } catch { }
  }, [currentUser]);

  function handleFormChange(key: string, value: string) {
    setForm(p => {
      const next = { ...p, [key]: value };
      if (saveAddrRef.current && addrKey && ADDR_FIELDS.includes(key)) {
        const toSave: Record<string, string> = {};
        ADDR_FIELDS.forEach(f => { toSave[f] = next[f] || ''; });
        localStorage.setItem(addrKey, JSON.stringify(toSave));
      }
      return next;
    });
  }

  function toggleSaveAddr(checked: boolean) {
    saveAddrRef.current = checked;
    setSaveAddr(checked);
    if (!addrKey) return;
    if (checked) {
      const toSave: Record<string, string> = {};
      ADDR_FIELDS.forEach(f => { toSave[f] = form[f] || ''; });
      localStorage.setItem(addrKey, JSON.stringify(toSave));
      showToast('💾 Sender address saved!');
    } else {
      localStorage.removeItem(addrKey);
      showToast('🗑️ Address removed from memory');
    }
  }

  async function loadServices() {
    setLoadingSvc(true);
    try {
      const res = await fetch('/api/services');
      const json = await res.json();
      if (json.success && json.data) {
        setServices(json.data);
        setSvcPage(1);
      } else {
        throw new Error('Fallback services error');
      }
    } catch {
      setMsg({ text: 'Error syncing service configuration.', type: 'error' });
    }
    setLoadingSvc(false);
  }

  function getPriceRange(id: string) {
    const svc = services.find(s => s.id === id);
    if (!svc || !svc.prices) return 'N/A';
    return `$${svc.prices[0].toFixed(2)} – $${svc.prices[svc.prices.length - 1].toFixed(2)}`;
  }

  function getServiceTime(id: string) {
    const svc = services.find(s => s.id === id);
    return svc?.time || '';
  }

  function priceEstimate() {
    if (!selectedService || !selectedService.prices) return null;
    const w = parseFloat(form.weight) || 0;
    if (w <= 0) return null;
    const prices = selectedService.prices;
    let finalPrice = prices[prices.length - 1];
    const weightRanges = [5, 10, 25, 40, 70];
    for (let i = 0; i < weightRanges.length; i++) {
      if (w <= weightRanges[i]) {
        finalPrice = prices[Math.min(i, prices.length - 1)];
        break;
      }
    }
    return finalPrice;
  }

  async function createOrder() {
    setMsg(null);
    if (!selectedService) return setMsg({ text: '⚠️ Please select a shipping service', type: 'error' });
    const required = ['fromName', 'fromAddress', 'fromCity', 'fromState', 'fromZip', 'toName', 'toAddress', 'toCity', 'toState', 'toZip', 'weight'];
    for (const f of required) {
      if (!form[f]?.trim()) return setMsg({ text: `⚠️ Please enter: ${f}`, type: 'error' });
    }

    setCreating(true);

    const payload = {
      label_id: selectedService.id,
      fromName: form.fromName.trim(), fromCompany: form.fromCompany.trim(),
      fromAddress: form.fromAddress.trim(), fromAddress2: form.fromAddress2.trim(),
      fromZip: form.fromZip.trim(), fromState: form.fromState.trim().toUpperCase(),
      fromCity: form.fromCity.trim(), fromCountry: form.fromCountry.trim() || 'US',
      toName: form.toName.trim(), toCompany: form.toCompany.trim(),
      toAddress: form.toAddress.trim(), toAddress2: form.toAddress2.trim(),
      toZip: form.toZip.trim(), toState: form.toState.trim().toUpperCase(),
      toCity: form.toCity.trim(), toCountry: form.toCountry.trim() || 'US',
      weight: parseFloat(form.weight) || 0,
      length: parseFloat(form.length) || 0,
      height: parseFloat(form.height) || 0,
      width: parseFloat(form.width) || 0,
      reference_1: form.ref1.trim(), reference_2: form.ref2.trim(),
      discription: form.desc.trim(),
    };

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        const detail = {
          id: data.order_id || '',
          tracking_id: data.tracking_id || '',
          pdf: data.pdf_url || '',
          price: data.price,
          service: selectedService?.name || '',
          weight: payload.weight,
          length: payload.length,
          width: payload.width,
          height: payload.height,
          from_name: payload.fromName,
          from_address: payload.fromAddress,
          from_city: payload.fromCity,
          from_state: payload.fromState,
          from_zip: payload.fromZip,
          to_name: payload.toName,
          to_address: payload.toAddress,
          to_city: payload.toCity,
          to_state: payload.toState,
          to_zip: payload.toZip,
          created_at: new Date().toLocaleString('en-US'),
          raw_response: null,
        } as any;
        setCreating(false);
        setOrderDetail(detail);
        updateBalance();
        return;
      } else {
        setMsg({ text: `❌ ${data.message || 'Carrier error'}`, type: 'error' });
      }
    } catch (e: unknown) {
      setMsg({ text: '❌ Connection error: ' + (e instanceof Error ? e.message : 'Unknown error'), type: 'error' });
    }
    setCreating(false);
  }

  function setF(key: string) { return (e: React.ChangeEvent<HTMLInputElement>) => handleFormChange(key, e.target.value); }

  const est = priceEstimate();

  return (
    <div className="max-w-4xl mx-auto">
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      {/* Balance card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-600 to-indigo-900 text-white rounded-3xl p-8 mb-8 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-between border border-blue-400/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="relative z-10">
          <div className="text-blue-100 font-medium tracking-wide flex items-center gap-2">
            Account Balance
            <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[10px] font-bold">LIVE</span>
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold mt-1 tracking-tight">${(Number(currentUser?.balance) || 0).toFixed(2)}</div>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="text-sm font-medium text-blue-200 flex items-center gap-2">
              <span className="opacity-70">API Key:</span>
              <code className="px-2 py-1 rounded bg-slate-900/40 border border-slate-700/50 font-mono text-xs">
                {(currentUser as any)?.api_key_id ? 'API Key (' + String((currentUser as any).api_key_id).substring(0, 4) + '...)' : 'Master Key'}
              </code>
            </div>
          </div>
        </div>
        <a
          href="https://t.me/minhte1102"
          target="_blank"
          rel="noreferrer"
          className="relative z-10 shrink-0 flex flex-col items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/30 text-white font-bold transition-all shadow-lg backdrop-blur-sm"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.085 14.09l-2.97-.924c-.643-.204-.657-.643.136-.953L16.95 7.3c.535-.194 1.003.13.612.948z" /></svg>
          <span className="text-sm font-extrabold tracking-wide">Top Up</span>
          <span className="text-[10px] text-white/70 font-medium">Contact us</span>
        </a>
      </div>

      {/* Services */}
      <Card title="1. Select shipping service">
        {loadingSvc ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
            <Spinner size={24} />
            <span className="font-semibold text-sm">Syncing routes...</span>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              {pagedServices.map(s => {
                const isActive = selectedService?.id === s.id;
                return (
                  <div key={s.id}
                    onClick={() => setSelectedService(isActive ? null : s)}
                    className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${isActive ? 'bg-blue-50/80 border-blue-500 ring-4 ring-blue-500/10 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'}`}>
                    {isActive && <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />}
                    <div className="pr-6">
                      <div className="font-extrabold text-slate-800 text-base mb-1">{s.name}</div>
                      <div className="text-emerald-600 font-bold text-sm mb-2">{getPriceRange(s.id)}</div>
                      <div className="flex flex-col gap-1 text-xs font-medium">
                        <span className="text-slate-500 flex items-center gap-1.5"><span className="opacity-50">⚖️</span> Max: {s.max_weight || '70 lbs'}</span>
                        {getServiceTime(s.id) && <span className="text-indigo-600 flex items-center gap-1.5"><span className="opacity-50">⏱</span> {getServiceTime(s.id)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalSvcPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSvcPage(p => Math.max(1, p - 1))}
                  disabled={svcPage === 1}
                  className="px-3 py-1.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalSvcPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setSvcPage(page)}
                    className={`w-8 h-8 rounded-xl text-sm font-bold transition-all ${page === svcPage
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setSvcPage(p => Math.min(totalSvcPages, p + 1))}
                  disabled={svcPage === totalSvcPages}
                  className="px-3 py-1.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Addresses */}
      <Card title="2. Shipping Information">
        <div className="flex items-center justify-end mb-4 -mt-2">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div
              onClick={() => toggleSaveAddr(!saveAddr)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${saveAddr ? 'bg-blue-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${saveAddr ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
              💾 Remember sender address
            </span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm">📤</span>
              <h3 className="font-bold text-slate-800 tracking-wide uppercase">Sender</h3>
            </div>
            {SECTIONS.map(([k, l]) => (
              <Field key={k} label={l}>
                {k === 'fromZip' ? (
                  <ZipInput value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))} />
                ) : (
                  <input className={inputCls} placeholder={k === 'fromState' ? 'CA' : ''}
                    value={form[k]} onChange={setF(k)} maxLength={k === 'fromState' || k === 'fromCountry' ? 2 : undefined} />
                )}
              </Field>
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm">📥</span>
              <h3 className="font-bold text-slate-800 tracking-wide uppercase">Recipient</h3>
            </div>
            {TO_SECTIONS.map(([k, l]) => (
              <Field key={k} label={l}>
                {k === 'toZip' ? (
                  <ZipInput value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))} />
                ) : (
                  <input className={inputCls} placeholder={k === 'toState' ? 'NY' : ''}
                    value={form[k]} onChange={setF(k)} maxLength={k === 'toState' || k === 'toCountry' ? 2 : undefined} />
                )}
              </Field>
            ))}
          </div>
        </div>
      </Card>

      {/* Package info */}
      <Card title="3. Package Information">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[['weight', 'Weight (lbs) *'], ['length', 'Length (in)'], ['width', 'Width (in)'], ['height', 'Height (in)']].map(([k, l]) => (
            <Field key={k} label={l}>
              <input className={inputCls} type="number" step="0.1" min="0.1" value={form[k]} onChange={setF(k)} placeholder="0.0" />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Reference 1"><input className={inputCls} value={form.ref1} onChange={setF('ref1')} placeholder="REF123" /></Field>
          <Field label="Reference 2"><input className={inputCls} value={form.ref2} onChange={setF('ref2')} placeholder="REF456" /></Field>
        </div>
        <Field label="Package Description">
          <input className={inputCls} value={form.desc} onChange={setF('desc')} placeholder="Electronics shipment..." />
        </Field>

        {est !== null && selectedService && (
          <div className="mt-6 flex items-center justify-between p-5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="font-bold text-emerald-800 text-sm">Estimated minimum cost</div>
                <div className="text-slate-500 text-xs font-medium mt-0.5">{selectedService.name} / {form.weight} lbs</div>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight">${est.toFixed(2)}</div>
          </div>
        )}
      </Card>

      <button onClick={createOrder} disabled={creating}
        className="w-full mt-4 mb-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-extrabold text-lg rounded-2xl shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3">
        {creating ? <><Spinner /> Processing transaction...</> : '🚀 Confirm Create Label'}
      </button>

      {orderDetail && <OrderSuccessModal d={orderDetail} onClose={() => setOrderDetail(null)} showToast={showToast} />}
    </div>
  );
}