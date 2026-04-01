'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';

import { Card, Alert, Spinner, Field, inputCls } from '@/components/ui';
import type { ShipService, OrderPayload } from '@/types';
import LabelModal from './LabelModal';

const SECTIONS: [string, string][] = [
  ['fromName','Name *'], ['fromCompany','Company'], ['fromAddress','Address *'],
  ['fromAddress2','Address 2'], ['fromCity','City *'], ['fromState','State *'],
  ['fromZip','ZIP *'], ['fromCountry','Country'],
];
const TO_SECTIONS: [string, string][] = [
  ['toName','Name *'], ['toCompany','Company'], ['toAddress','Address *'],
  ['toAddress2','Address 2'], ['toCity','City *'], ['toState','State *'],
  ['toZip','ZIP *'], ['toCountry','Country'],
];

export default function CreateTab() {
  const { currentUser, services, setServices, selectedService, setSelectedService, updateBalance, showToast } = useApp();
  const [loadingSvc, setLoadingSvc] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [labelResult, setLabelResult] = useState<{ d: Record<string,unknown>; price: number } | null>(null);

  // Form state
  const [form, setForm] = useState<Record<string, string>>({
    fromName:'', fromCompany:'', fromAddress:'', fromAddress2:'',
    fromCity:'', fromState:'', fromZip:'', fromCountry:'US',
    toName:'', toCompany:'', toAddress:'', toAddress2:'',
    toCity:'', toState:'', toZip:'', toCountry:'US',
    weight:'', length:'', width:'', height:'', ref1:'', ref2:'', desc:'',
  });

  useEffect(() => {
    if (!currentUser) return;
    loadServices();
  }, [currentUser]);

  async function loadServices() {
    setLoadingSvc(true);
    try {
      const res = await fetch('/api/services');
      const json = await res.json();
      if (json.success && json.data) {
        setServices(json.data);
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
    
    // Simple frontend logic match backend
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
    const required = ['fromName','fromAddress','fromCity','fromState','fromZip','toName','toAddress','toCity','toState','toZip','weight'];
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
        setLabelResult({ d: data, price: data.price });
        await updateBalance(); 
        setMsg({ text: 'Order created successfully!', type: 'success' });
      } else {
        setMsg({ text: `❌ ${data.message || 'Carrier error'}`, type: 'error' });
      }
    } catch (e: unknown) {
      setMsg({ text: '❌ Connection error: ' + (e instanceof Error ? e.message : 'Unknown error'), type: 'error' });
    }
    setCreating(false);
  }

  function setF(key: string) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [key]: e.target.value })); }

  const est = priceEstimate();

  return (
    <div className="max-w-4xl mx-auto">
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      {/* Premium Balance card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-600 to-indigo-900 text-white rounded-3xl p-8 mb-8 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-between border border-blue-400/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="relative z-10">
          <div className="text-blue-100 font-medium tracking-wide flex items-center gap-2">
            Account Balance 
            <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[10px] font-bold">LIVE</span>
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold mt-1 tracking-tight">${(Number(currentUser?.balance) || 0).toFixed(2)}</div>
          <div className="text-sm font-medium text-blue-200 mt-4 flex items-center gap-2">
            <span className="opacity-70">Using API Key:</span>
            <code className="px-2 py-1 rounded bg-slate-900/40 border border-slate-700/50 font-mono text-xs">
              {(currentUser as any)?.api_key_id ? 'API Key (' + String((currentUser as any).api_key_id).substring(0,4) + '...)' : 'Master Key'}
            </code>
          </div>
        </div>
        <div className="relative z-10 hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
          <span className="text-4xl">💰</span>
        </div>
      </div>

      {/* Services */}
      <Card title="1. Select shipping service">
        {loadingSvc ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
            <Spinner size={24} /> 
            <span className="font-semibold text-sm">Syncing routes...</span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {services.map(s => {
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
        )}
      </Card>

      {/* Addresses */}
      <Card title="2. Shipping Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm">📤</span>
              <h3 className="font-bold text-slate-800 tracking-wide uppercase">Sender</h3>
            </div>
            {SECTIONS.map(([k, l]) => (
              <Field key={k} label={l}>
                <input className={inputCls} placeholder={k === 'fromState' ? 'CA' : k === 'fromZip' ? '90001' : ''}
                  value={form[k]} onChange={setF(k)} maxLength={k === 'fromState' || k === 'fromCountry' ? 2 : undefined} />
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
                <input className={inputCls} placeholder={k === 'toState' ? 'NY' : k === 'toZip' ? '10001' : ''}
                  value={form[k]} onChange={setF(k)} maxLength={k === 'toState' || k === 'toCountry' ? 2 : undefined} />
              </Field>
            ))}
          </div>
        </div>
      </Card>

      {/* Package info */}
      <Card title="3. Package Information">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[['weight','Weight (lbs) *'],['length','Length (in)'],['width','Width (in)'],['height','Height (in)']].map(([k,l]) => (
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

      {labelResult && (
        <LabelModal
          open={!!labelResult}
          onClose={() => setLabelResult(null)}
          d={labelResult.d}
          price={labelResult.price}
          serviceName={selectedService?.name || ''}
        />
      )}
    </div>
  );
}
