'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Modal, ModalActions, Btn, Badge, Alert, Field, inputCls, selectCls, KeyBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { User } from '@/types';

export default function AdminTab() {
  const { currentUser, showToast, updateBalance } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [userModal, setUserModal] = useState<{ open: boolean; edit: string | null }>({ open: false, edit: null });
  const [topupModal, setTopupModal] = useState<string | null>(null);
  const [umMsg, setUmMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [topupMsg, setTopupMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const [umData, setUmData] = useState({ username: '', name: '', email: '', pass: '', balance: '0', role: 'user', apiKeyId: '' });
  const [topupAmount, setTopupAmount] = useState('10');
  const [topupNote, setTopupNote] = useState('');
  const [deductModal, setDeductModal] = useState<string | null>(null);
  const [deductMsg, setDeductMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [deductAmount, setDeductAmount] = useState('10');
  const [deductNote, setDeductNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      } else {
        showToast('Failed to load admin data: ' + json.message);
      }
    } catch {
      showToast('Unable to connect to server');
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setUmData({ username: '', name: '', email: '', pass: '', balance: '0', role: 'user', apiKeyId: '' });
    setUmMsg(null);
    setUserModal({ open: true, edit: null });
  }

  function openEdit(username: string) {
    const u = users.find(x => x.username === username);
    if (!u) return;
    setUmData({ username: u.username, name: u.name, email: u.email || '', pass: '', balance: (u.balance || 0).toFixed(2), role: u.role, apiKeyId: (u as any).api_key_id || '' });
    setUmMsg(null);
    setUserModal({ open: true, edit: username });
  }

  async function saveUser() {
    const { username, name, email, pass, balance, role, apiKeyId } = umData;
    if (!username || !name) return setUmMsg({ text: '⚠️ Please fill in all required fields', type: 'error' });
    if (/\s/.test(username)) return setUmMsg({ text: '⚠️ Username must not contain spaces', type: 'error' });
    
    if (!userModal.edit && !pass) {
      return setUmMsg({ text: '⚠️ Please enter a password', type: 'error' });
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: userModal.edit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, email, pass, balance, role, apiKeyId }),
      });
      const data = await res.json();
      if (!data.success) {
        return setUmMsg({ text: '❌ ' + data.message, type: 'error' });
      }

      setUmMsg({ text: '✅ Saved successfully!', type: 'success' });
      setTimeout(() => { setUserModal({ open: false, edit: null }); load(); }, 800);
    } catch {
      setUmMsg({ text: '❌ Network connection error', type: 'error' });
    }
  }

  async function deleteUser(username: string) {
    if (!confirm(`DELETE WARNING: Confirm delete "${username}"?\nAll orders and history created by this user will be permanently deleted and cannot be recovered!`)) return;
    try {
      const res = await fetch(`/api/admin/users?username=${username}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        load();
      } else {
        alert('Error: ' + data.message);
      }
    } catch {
      alert('Network connection error');
    }
  }

  async function doTopup() {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return setTopupMsg({ text: '⚠️ Invalid amount', type: 'error' });
    
    try {
      const res = await fetch('/api/admin/users/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: topupModal, amount, note: topupNote }),
      });
      const data = await res.json();
      
      if (data.success) {
        setTopupMsg({ text: `✅ Topped up $${amount.toFixed(2)} successfully! Balance: $${data.balance.toFixed(2)}`, type: 'success' });
        if (currentUser?.username === topupModal) updateBalance();
        setTimeout(() => { setTopupModal(null); load(); }, 1200);
      } else {
        setTopupMsg({ text: '❌ ' + data.message, type: 'error' });
      }
    } catch {
      setTopupMsg({ text: '❌ Network connection error', type: 'error' });
    }
  }

  const topupUser = topupModal ? users.find(x => x.username === topupModal) : null;
  const deductUser = deductModal ? users.find(x => x.username === deductModal) : null;

  async function doDeduct() {
    const amount = parseFloat(deductAmount);
    if (!amount || amount <= 0) return setDeductMsg({ text: '⚠️ Invalid amount', type: 'error' });

    try {
      const res = await fetch('/api/admin/users/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: deductModal, amount, note: deductNote }),
      });
      const data = await res.json();

      if (data.success) {
        setDeductMsg({ text: `✅ Deducted $${amount.toFixed(2)}. New balance: $${data.balance.toFixed(2)}`, type: 'success' });
        if (currentUser?.username === deductModal) updateBalance();
        setTimeout(() => { setDeductModal(null); load(); }, 1200);
      } else {
        setDeductMsg({ text: '❌ ' + data.message, type: 'error' });
      }
    } catch {
      setDeductMsg({ text: '❌ Network connection error', type: 'error' });
    }
  }

  return (
    <Card title="👥 User Management">
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <button onClick={openAdd}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
          ➕ Add User
        </button>
        <button onClick={load}
          className="px-3 py-1.5 text-sm font-semibold text-blue-600 border-[1.5px] border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          🔄 Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              {['Username','Full Name','Email','Balance','Role','API Key','Orders','Actions'].map(h => (
                <th key={h} className="px-3 py-2.5 font-bold border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const uAny = u as any;
              const keyLabel = uAny.api_key_id ? 'API Key (' + uAny.api_key_id.slice(0,4) + '...)' : 'Master Key';
              const isMaster = keyLabel === 'Master Key';
              return (
                <tr key={u.username} className="hover:bg-gray-50/70 border-b border-gray-100">
                  <td className="px-3 py-2.5 font-bold">{u.username}</td>
                  <td className="px-3 py-2.5">{u.name}</td>
                  <td className="px-3 py-2.5 text-gray-400 text-xs">{u.email || '-'}</td>
                  <td className="px-3 py-2.5 font-bold text-green-600">${(u.balance || 0).toFixed(2)}</td>
                  <td className="px-3 py-2.5"><Badge variant={u.role === 'admin' ? 'error' : 'success'}>{u.role}</Badge></td>
                  <td className="px-3 py-2.5"><KeyBadge blue={isMaster}>{keyLabel}</KeyBadge></td>
                  <td className="px-3 py-2.5">{(u.orders || []).length}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => { setTopupModal(u.username); setTopupMsg(null); setTopupAmount('10'); setTopupNote(''); }}
                        className="px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded-md">💰 Top Up</button>
                      <button onClick={() => { setDeductModal(u.username); setDeductMsg(null); setDeductAmount('10'); setDeductNote(''); }}
                        className="px-2.5 py-1 bg-orange-500 text-white text-xs font-semibold rounded-md">💸 Deduct</button>
                      <button onClick={() => openEdit(u.username)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 border border-blue-500 rounded-md hover:bg-blue-50">✏️</button>
                      {u.username !== 'admin' && (
                        <button onClick={() => deleteUser(u.username)}
                          className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-md">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User modal */}
      <Modal open={userModal.open} onClose={() => setUserModal({ open: false, edit: null })}
        title={userModal.edit ? `✏️ Edit: ${userModal.edit}` : '➕ Add User'}>
        {umMsg && <Alert type={umMsg.type}>{umMsg.text}</Alert>}
        <Field label="Username *">
          <input className={inputCls} value={umData.username} disabled={!!userModal.edit}
            onChange={e => setUmData(p => ({ ...p, username: e.target.value }))} />
        </Field>
        <Field label="Full Name *">
          <input className={inputCls} value={umData.name} onChange={e => setUmData(p => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={umData.email} onChange={e => setUmData(p => ({ ...p, email: e.target.value }))} />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" placeholder="Leave blank to keep unchanged" value={umData.pass}
            onChange={e => setUmData(p => ({ ...p, pass: e.target.value }))} />
        </Field>
        <Field label="Balance ($)">
          <input className={inputCls} type="number" step="0.01" value={umData.balance}
            onChange={e => setUmData(p => ({ ...p, balance: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={selectCls} value={umData.role} onChange={e => setUmData(p => ({ ...p, role: e.target.value }))}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Assign API Key">
          <select className={selectCls} value={umData.apiKeyId} onChange={e => setUmData(p => ({ ...p, apiKeyId: e.target.value }))}>
            <option value="">-- Use Master Key --</option>
            {apiKeys.map(k => <option key={k.id} value={k.id}>{k.label} ({k.key.slice(0, 4) + '...'}) — {k.status}</option>)}
          </select>
        </Field>
        <ModalActions>
          <Btn onClick={() => setUserModal({ open: false, edit: null })} className="border-[1.5px] border-blue-600 text-blue-600 hover:bg-blue-50">Cancel</Btn>
          <Btn onClick={saveUser} className="bg-green-600 hover:bg-green-700 text-white">💾 Save</Btn>
        </ModalActions>
      </Modal>

      {/* Topup modal */}
      <Modal open={!!topupModal} onClose={() => setTopupModal(null)} title="💰 Top Up User Balance">
        {topupMsg && <Alert type={topupMsg.type}>{topupMsg.text}</Alert>}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          Account: <strong>{topupModal}</strong><br />
          Current balance: <strong className="text-blue-600">${(topupUser?.balance || 0).toFixed(2)}</strong>
        </div>
        <Field label="Amount ($) *">
          <input className={inputCls} type="number" step="0.01" min="0.01" value={topupAmount}
            onChange={e => setTopupAmount(e.target.value)} />
        </Field>
        <Field label="Note">
          <input className={inputCls} placeholder="e.g. Top-up April" value={topupNote}
            onChange={e => setTopupNote(e.target.value)} />
        </Field>
        {topupUser?.topup_history?.length ? (
          <div className="mt-2">
            <div className="text-xs font-bold text-gray-400 mb-1.5">📋 Top-up history:</div>
            <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1.5">
              {topupUser.topup_history.slice(0, 15).map((h, i) => (
                <div key={i} className={`flex justify-between text-xs gap-2 ${h.amount < 0 ? 'bg-red-50/50 p-1 rounded border border-red-50/50' : ''}`}>
                  <span className="text-gray-400">{h.date}</span>
                  <span className={`font-bold ${h.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {h.amount > 0 ? '+' : ''}${h.amount.toFixed(2)}
                  </span>
                  <span className="text-gray-500">→ ${h.after.toFixed(2)}</span>
                  {h.note && <span className="text-gray-300 italic">{h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <ModalActions>
          <Btn onClick={() => setTopupModal(null)} className="border-[1.5px] border-blue-600 text-blue-600 hover:bg-blue-50">Cancel</Btn>
          <Btn onClick={doTopup} className="bg-green-600 hover:bg-green-700 text-white">✅ Top Up</Btn>
        </ModalActions>
      </Modal>

      {/* Deduct modal */}
      <Modal open={!!deductModal} onClose={() => setDeductModal(null)} title="💸 Deduct User Balance">
        {deductMsg && <Alert type={deductMsg.type}>{deductMsg.text}</Alert>}
        <div className="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm">
          Account: <strong>{deductModal}</strong><br />
          Current balance: <strong className="text-orange-600">${(deductUser?.balance || 0).toFixed(2)}</strong>
        </div>
        <Field label="Amount to deduct ($) *">
          <input className={inputCls} type="number" step="0.01" min="0.01" value={deductAmount}
            onChange={e => setDeductAmount(e.target.value)} />
        </Field>
        <Field label="Reason / Note">
          <input className={inputCls} placeholder="e.g. Service fee, adjustment..." value={deductNote}
            onChange={e => setDeductNote(e.target.value)} />
        </Field>
        {deductUser?.topup_history?.length ? (
          <div className="mt-2">
            <div className="text-xs font-bold text-gray-400 mb-1.5">📋 Recent history:</div>
            <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1.5">
              {deductUser.topup_history.slice(0, 15).map((h, i) => (
                <div key={i} className={`flex justify-between text-xs gap-2 ${h.amount < 0 ? 'bg-red-50 p-1 rounded' : ''}`}>
                  <span className="text-gray-400">{h.date}</span>
                  <span className={`font-bold ${h.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {h.amount > 0 ? '+' : ''}{h.amount.toFixed(2)}
                  </span>
                  <span className="text-gray-500">→ ${h.after.toFixed(2)}</span>
                  {h.note && <span className="text-gray-300 italic truncate max-w-[100px]">{h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <ModalActions>
          <Btn onClick={() => setDeductModal(null)} className="border-[1.5px] border-slate-400 text-slate-600 hover:bg-slate-50">Cancel</Btn>
          <Btn onClick={doDeduct} className="bg-orange-500 hover:bg-orange-600 text-white">💸 Confirm Deduct</Btn>
        </ModalActions>
      </Modal>
    </Card>
  );
}
