'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Alert, Btn, Field, inputCls } from '@/components/ui';
import type { User } from '@/types';

export default function AuthScreen() {
  const { setCurrentUser, setActiveTab } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Login fields
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register fields
  const [regUser, setRegUser] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regInvite, setRegInvite] = useState('');

  async function doLogin() {
    if (!loginUser || !loginPass) return setMsg({ text: 'Vui lòng nhập đầy đủ thông tin', type: 'error' });
    setMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        setActiveTab('create');
      } else {
        setMsg({ text: data.message || 'Lỗi đăng nhập', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Lỗi máy chủ rớt mạng', type: 'error' });
    }
  }

  async function doRegister() {
    if (!regUser || !regName || !regPass) return setMsg({ text: 'Vui lòng nhập đầy đủ thông tin bắt buộc', type: 'error' });
    setMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUser,
          name: regName,
          email: regEmail,
          password: regPass,
          invite: regInvite,
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: '✅ Tạo tài khoản thành công! Đang đăng nhập...', type: 'success' });
        setTimeout(() => { 
          setCurrentUser(data.data); 
          setActiveTab('create'); 
        }, 900);
      } else {
        setMsg({ text: data.message || 'Lỗi đăng ký', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Lỗi kết nối máy chủ', type: 'error' });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 w-[420px] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] z-10 animate-fade-in my-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 text-white text-2xl mb-5">
            🚚
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">ShipLabel</h1>
          <p className="text-blue-100/70 font-medium">Nền tảng vận chuyển thông minh</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-white/5 rounded-xl mb-8 border border-white/10">
          {(['login', 'register'] as const).map((t, i) => (
            <button key={t} onClick={() => { setTab(t); setMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${tab === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              {i === 0 ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        {msg && <Alert type={msg.type}>{msg.text}</Alert>}

        <div className="animate-slide-up">
          {tab === 'login' ? (
            <div className="space-y-4">
              <Field label="Tên đăng nhập">
                <input className={inputCls} placeholder="Nhập username..." value={loginUser}
                  onChange={e => setLoginUser(e.target.value)} />
              </Field>
              <Field label="Mật khẩu">
                <input className={inputCls} type="password" placeholder="••••••••" value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()} />
              </Field>
              <button onClick={doLogin}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]">
                Đăng nhập
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <Field label="Tên đăng nhập *">
                <input className={inputCls} placeholder="username" value={regUser} onChange={e => setRegUser(e.target.value)} />
              </Field>
              <Field label="Họ tên *">
                <input className={inputCls} placeholder="Nguyễn Văn A" value={regName} onChange={e => setRegName(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" placeholder="email@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </Field>
              <Field label="Mật khẩu *">
                <input className={inputCls} type="password" placeholder="••••••••" value={regPass} onChange={e => setRegPass(e.target.value)} />
              </Field>
              <Field label="Mã mời (nếu có)">
                <input className={inputCls} placeholder="Nhập mã mời từ admin" value={regInvite} onChange={e => setRegInvite(e.target.value)} />
              </Field>
              <button onClick={doRegister}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]">
                Tạo tài khoản
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
