'use client';

import React, { useState, useEffect } from 'react';
import { WEIGHT_RANGES } from '@/lib/db';
import { Card, Alert, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';

// Payload we send to backend: { "237": { prices: [1,2], is_active: true, time: "2 Days" } }
type PricingPayload = Record<string, { prices: number[], is_active: boolean, time: string }>;

export default function PricingTab() {
  const { setServices: setGlobalServices } = useApp();
  const [services, setServices] = useState<any[]>([]);
  const [payload, setPayload] = useState<PricingPayload>({});
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      // Fetch all services including inactive/unpriced
      const res = await fetch('/api/services?all=true');
      const json = await res.json();
      if (json.success && json.data) {
        setServices(json.data);
        
        const init: PricingPayload = {};
        json.data.forEach((s: any) => {
          init[s.id] = {
            prices: s.prices || [0,0,0,0,0],
            is_active: s.is_active === true,
            time: s.time || ''
          };
        });
        setPayload(init);
      }
    } catch {
      setMsg({ text: 'Failed to load pricing data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function setPrice(id: string, idx: number, val: string) {
    setPayload(prev => {
      const current = prev[id] || { prices: [0,0,0,0,0], is_active: false, time: '' };
      const newPrices = [...current.prices];
      newPrices[idx] = parseFloat(val) || 0;
      return {
        ...prev,
        [id]: {
          ...current,
          prices: newPrices
        }
      };
    });
  }

  function toggleActive(id: string) {
    setPayload(prev => {
      const current = prev[id] || { prices: [0,0,0,0,0], is_active: false, time: '' };
      return {
        ...prev,
        [id]: {
          ...current,
          is_active: !current.is_active
        }
      };
    });
  }

  function setTime(id: string, val: string) {
    setPayload(prev => {
      const current = prev[id] || { prices: [0,0,0,0,0], is_active: false, time: '' };
      return {
        ...prev,
        [id]: { ...current, time: val }
      };
    });
  }

  async function save() {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: '✅ Pricing config saved successfully!', type: 'success' });
        try {
          // Force refresh global services so other tabs pick up the latest data
          const freshRes = await fetch('/api/services');
          const freshJson = await freshRes.json();
          if (freshJson.success) setGlobalServices(freshJson.data);
        } catch(e) {}
      } else {
        setMsg({ text: '❌ Error: ' + data.message, type: 'error' });
      }
    } catch {
      setMsg({ text: '❌ Database connection failed', type: 'error' });
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMsg(null), 3000);
  }

  async function triggerSync() {
    if (!confirm('Fetch latest service list from the upstream system?')) return;
    try {
      setSyncing(true);
      setMsg({ text: '⏳ Syncing...', type: 'info' });
      const res = await fetch('/api/admin/sync-services', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: '✅ ' + data.message, type: 'success' });
        await load(); // refresh grid
      } else {
        setMsg({ text: '❌ Sync error: ' + data.message, type: 'error' });
      }
    } catch (err) {
      setMsg({ text: '❌ Network / DB connection failed', type: 'error' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="relative">
      {/* Loading Overlay */}
      {(loading || syncing || saving) && (
        <div className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center border border-slate-100">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-slate-100 flex flex-col items-center justify-center gap-3">
            <Spinner size={32} />
            <span className="text-sm font-semibold text-slate-700">
              {syncing ? 'Fetching services...' : saving ? 'Saving config...' : 'Loading...'}
            </span>
          </div>
        </div>
      )}

      <Card title="💲 Service & Pricing Management">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <p className="text-gray-400 text-sm">Set selling prices for users (USD). Only <b>enabled (ON)</b> services will appear in the Create tab.</p>
          <button onClick={triggerSync} disabled={syncing || saving}
            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
            {syncing ? <Spinner /> : '🔄'} Sync from Upstream
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl relative">
          <table className="w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-4 py-3 font-bold text-slate-500 w-12 text-center">On</th>
                <th className="px-4 py-3 font-bold text-slate-500 w-24">ID</th>
                <th className="px-4 py-3 font-bold text-slate-500 min-w-[200px]">Service & Transit Time</th>
                <th className="px-4 py-3 font-bold text-slate-500 w-24">Max Weight</th>
                {WEIGHT_RANGES.map(r => (
                  <th key={r.id} className="px-4 py-3 font-bold text-slate-500 text-center">{r.label}</th>
                ))}
                <th className="px-4 py-3 font-bold text-slate-500 text-right">Provider Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => {
                const state = payload[s.id] || { prices: [0,0,0,0,0], is_active: false, time: '' };
                const isActive = state.is_active;
                
                let origPrices = '';
                try {
                  if (s.provider_prices && s.provider_prices.length > 0) {
                    origPrices = s.provider_prices.map((p: any) => `${p.max_weight || ''}: ${p.price || ''}`).join(', ');
                  }
                } catch(e) {}

                return (
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${!isActive ? 'opacity-50 grayscale bg-slate-50/50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={isActive} onChange={() => toggleActive(s.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-mono">{s.id}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700">{s.name}</div>
                      <input type="text"
                         value={state.time} 
                         onChange={e => setTime(s.id, e.target.value)} 
                         placeholder="VD: 3-5 days" 
                         className="mt-1 w-full max-w-[160px] px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.max_weight}</td>
                    
                    {WEIGHT_RANGES.map((_, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        <input type="number" min="0" step="0.01"
                          value={state.prices[i] ?? 0}
                          onChange={e => setPrice(s.id, i, e.target.value)}
                          className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center font-bold text-blue-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </td>
                    ))}
                    
                    <td className="px-4 py-3 text-right">
                      <div className="text-[10px] text-slate-400 leading-tight max-w-[150px] ml-auto overflow-hidden text-ellipsis whitespace-nowrap" title={origPrices}>
                        {origPrices || 'N/A'}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {services.length === 0 && !loading && (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">No services found. Click "Sync from Upstream" to fetch them.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2.5 mt-6 flex-wrap">
          <button onClick={save} disabled={loading || syncing || saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50">
            💾 Save Pricing
          </button>
        </div>
        {msg && <div className="mt-4"><Alert type={msg.type}>{msg.text}</Alert></div>}
      </Card>
    </div>
  );
}
