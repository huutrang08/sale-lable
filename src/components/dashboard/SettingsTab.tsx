'use client';

import React, { useState, useEffect } from 'react';
import { getDB, saveDB, DEFAULT_MASTER_API } from '@/lib/db';
import { Card, Alert, Field, inputCls, selectCls } from '@/components/ui';

export default function SettingsTab() {
  const [masterKey, setMasterKey] = useState('');
  const [inviteCode, setInviteCode] = useState('SHIP');
  const [openReg, setOpenReg] = useState('0');
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const db = getDB();
    const s = db.settings || {};
    setMasterKey(s.master_api || DEFAULT_MASTER_API);
    setInviteCode(s.invite_code || 'SHIP');
    setOpenReg(s.open_register ? '1' : '0');
  }, []);

  function save() {
    if (!masterKey) return setMsg({ text: '⚠️ Master API Key cannot be empty', type: 'error' });
    const db = getDB();
    if (!db.settings) db.settings = { master_api: '', invite_code: '', open_register: false };
    db.settings.master_api = masterKey;
    db.settings.invite_code = inviteCode;
    db.settings.open_register = openReg === '1';
    saveDB(db);
    setMsg({ text: '✅ Settings saved successfully!', type: 'success' });
    setTimeout(() => setMsg(null), 3000);
  }

  return (
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
      <button onClick={save}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors">
        💾 Save Settings
      </button>
      {msg && <div className="mt-3"><Alert type={msg.type}>{msg.text}</Alert></div>}
    </Card>
  );
}
