'use client';

import React, { useState, useEffect } from 'react';
import { getDB, saveDB, maskKey, getMasterKey } from '@/lib/db';
import { Card, Modal, ModalActions, Btn, Badge, Alert, Field, inputCls, selectCls, KeyBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { ApiKey, User } from '@/types';

export default function ApiKeysTab() {
  const { showToast } = useApp();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [form, setForm] = useState({ label: '', key: '', assignTo: '', status: 'active' });

  useEffect(() => { load(); }, []);

  function load() {
    const db = getDB();
    setApiKeys(db.api_keys || []);
    setUsers(db.users || []);
  }

  function getUsersUsingKey(keyId: string): string {
    const us = users.filter(u => u.apiKeyId === keyId);
    return us.length ? us.map(u => u.username).join(', ') : '—';
  }

  function openAdd() {
    setForm({ label: '', key: '', assignTo: '', status: 'active' });
    setMsg(null);
    setModal({ open: true, editId: null });
  }

  function openEdit(keyId: string) {
    const db = getDB();
    const k = db.api_keys.find(x => x.id === keyId);
    if (!k) return;
    const assigned = db.users.find(u => u.apiKeyId === keyId);
    setForm({ label: k.label, key: k.key, assignTo: assigned?.username || '', status: k.status });
    setMsg(null);
    setModal({ open: true, editId: keyId });
  }

  function save() {
    const { label, key, assignTo, status } = form;
    if (!label || !key) return setMsg({ text: '⚠️ Vui lòng điền đầy đủ Label và Key', type: 'error' });
    const db = getDB();
    if (!db.api_keys) db.api_keys = [];
    let keyId = modal.editId;
    if (modal.editId) {
      const k = db.api_keys.find(x => x.id === modal.editId);
      if (!k) return;
      k.label = label; k.key = key; k.status = status as 'active' | 'inactive';
      setMsg({ text: '✅ Cập nhật thành công!', type: 'success' });
    } else {
      if (db.api_keys.find(x => x.key === key)) return setMsg({ text: '⚠️ Key này đã tồn tại', type: 'error' });
      keyId = 'key_' + Date.now();
      db.api_keys.push({ id: keyId!, label, key, status: status as 'active' | 'inactive', created_at: new Date().toLocaleString('vi-VN') });
      setMsg({ text: '✅ Thêm thành công!', type: 'success' });
    }
    db.users.forEach(u => { if (u.apiKeyId === keyId) u.apiKeyId = null; });
    if (assignTo) { const tu = db.users.find(u => u.username === assignTo); if (tu) tu.apiKeyId = keyId!; }
    saveDB(db);
    setTimeout(() => { setModal({ open: false, editId: null }); load(); }, 800);
  }

  function deleteKey(keyId: string) {
    const db = getDB();
    const k = db.api_keys.find(x => x.id === keyId);
    if (!confirm(`Xác nhận xóa API Key "${k?.label}"?`)) return;
    db.users.forEach(u => { if (u.apiKeyId === keyId) u.apiKeyId = null; });
    db.api_keys = db.api_keys.filter(x => x.id !== keyId);
    saveDB(db); load();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast('📋 Đã sao chép!'));
  }

  return (
    <Card title="🔑 Quản lý API Keys">
      <p className="text-gray-400 text-sm mb-4">Mỗi user có thể gán API key riêng. Nếu không gán, hệ thống dùng Master Key.</p>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <button onClick={openAdd}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
          ➕ Thêm API Key
        </button>
        <button onClick={load}
          className="px-3 py-1.5 text-sm font-semibold text-blue-600 border-[1.5px] border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          🔄 Làm mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              {['Tên','API Key','Gán cho user','Trạng thái','Ngày tạo','Thao tác'].map(h => (
                <th key={h} className="px-3 py-2.5 font-bold border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Master key row */}
            <tr className="bg-blue-50/50 border-b border-gray-100">
              <td className="px-3 py-2.5 font-bold">Master Key <Badge variant="info">System</Badge></td>
              <td className="px-3 py-2.5"><KeyBadge blue>{maskKey(getMasterKey())}</KeyBadge></td>
              <td className="px-3 py-2.5 text-gray-400 text-xs">Tất cả user không gán key riêng</td>
              <td className="px-3 py-2.5"><Badge variant="success">active</Badge></td>
              <td className="px-3 py-2.5 text-gray-300 text-xs">—</td>
              <td className="px-3 py-2.5">
                <button onClick={() => copy(getMasterKey())}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 border border-blue-500 rounded-md hover:bg-blue-50">📋 Copy</button>
              </td>
            </tr>
            {apiKeys.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-300 py-6 text-sm">Chưa có API key phụ nào</td></tr>
            ) : apiKeys.map(k => (
              <tr key={k.id} className="hover:bg-gray-50/70 border-b border-gray-100">
                <td className="px-3 py-2.5 font-semibold">{k.label}</td>
                <td className="px-3 py-2.5"><KeyBadge>{maskKey(k.key)}</KeyBadge></td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{getUsersUsingKey(k.id)}</td>
                <td className="px-3 py-2.5"><Badge variant={k.status === 'active' ? 'success' : 'error'}>{k.status}</Badge></td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{k.created_at || '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <button onClick={() => copy(k.key)} className="px-2 py-1 text-xs border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50">📋</button>
                    <button onClick={() => openEdit(k.id)} className="px-2 py-1 text-xs border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50">✏️</button>
                    <button onClick={() => deleteKey(k.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded-md">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, editId: null })}
        title={modal.editId ? '✏️ Sửa API Key' : '➕ Thêm API Key'}>
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        <Field label="Tên / Nhãn *">
          <input className={inputCls} placeholder="VD: Key tài khoản A" value={form.label}
            onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
        </Field>
        <Field label="API Key *">
          <input className={inputCls} placeholder="1234|abcdefg..." value={form.key}
            onChange={e => setForm(p => ({ ...p, key: e.target.value }))} />
        </Field>
        <Field label="Gán cho user">
          <select className={selectCls} value={form.assignTo} onChange={e => setForm(p => ({ ...p, assignTo: e.target.value }))}>
            <option value="">-- Chưa gán --</option>
            {users.map(u => <option key={u.username} value={u.username}>{u.username} ({u.name})</option>)}
          </select>
        </Field>
        <Field label="Trạng thái">
          <select className={selectCls} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <ModalActions>
          <Btn onClick={() => setModal({ open: false, editId: null })} className="border-[1.5px] border-blue-600 text-blue-600 hover:bg-blue-50">Hủy</Btn>
          <Btn onClick={save} className="bg-green-600 hover:bg-green-700 text-white">💾 Lưu</Btn>
        </ModalActions>
      </Modal>
    </Card>
  );
}
