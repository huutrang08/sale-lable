'use client';

import React, { useState, useEffect } from 'react';
import { Card, Alert, Field, inputCls, selectCls } from '@/components/ui';

export default function SettingsTab() {
  const [loading, setLoading] = useState(true);
  const [masterKey, setMasterKey] = useState('');
  const [inviteCode, setInviteCode] = useState('SHIP');
  const [openReg, setOpenReg] = useState('0');
  
  // NOWPayments configs
  const [npApiKey, setNpApiKey] = useState('');
  const [npIpnSecret, setNpIpnSecret] = useState('');

  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (json.success && json.data) {
          const s = json.data;
          setMasterKey(s.master_api || '');
          setInviteCode(s.invite_code || 'SHIP');
          setOpenReg(s.open_register === 'true' ? '1' : '0');
          setNpApiKey(s.nowpayments_api_key || '');
          setNpIpnSecret(s.nowpayments_ipn_secret || '');
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    if (!masterKey) return setMsg({ text: '⚠️ Master API Key cannot be empty', type: 'error' });
    
    const payload = {
      master_api: masterKey,
      invite_code: inviteCode,
      open_register: openReg === '1' ? 'true' : 'false',
      nowpayments_api_key: npApiKey,
      nowpayments_ipn_secret: npIpnSecret
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ text: '✅ Settings saved successfully!', type: 'success' });
      } else {
        setMsg({ text: '❌ Failed to save: ' + json.message, type: 'error' });
      }
    } catch (err) {
      setMsg({ text: '❌ Network connection error', type: 'error' });
    }
    setTimeout(() => setMsg(null), 3000);
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="grid gap-6 max-w-4xl">
      <Card title="⚙️ System Settings">
        <Field label="Master API Key (shiplabel.net)">
          <input className={inputCls} placeholder="1779|..." value={masterKey} onChange={e => setMasterKey(e.target.value)} />
        </Field>
        <Field label="Registration Invite Code">
          <input className={inputCls} placeholder="SHIP2024" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
        </Field>
        <Field label="Allow Open Registration">
          <select className={selectCls} value={openReg} onChange={e => setOpenReg(e.target.value)}>
            <option value="0">No — Invite Code required</option>
            <option value="1">Yes — Anyone can register</option>
          </select>
        </Field>
      </Card>

      <Card title="NOWPayments Configuration (Crypto API)">
        <Field label="NOWPayments API Key">
          <input className={inputCls} placeholder="Enter API Key from NOWPayments Dashboard" value={npApiKey} onChange={e => setNpApiKey(e.target.value)} />
        </Field>
        <Field label="NOWPayments IPN Secret Key">
          <input className={inputCls} placeholder="Enter IPN Secret Key for Webhook security" value={npIpnSecret} onChange={e => setNpIpnSecret(e.target.value)} />
        </Field>
      </Card>

      <div>
        <button onClick={save}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors">
          💾 Save Settings
        </button>
        {msg && <div className="mt-3"><Alert type={msg.type}>{msg.text}</Alert></div>}
      </div>
    </div>
  );
}
