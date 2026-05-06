'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Alert, Btn, Field, inputCls, Spinner } from '@/components/ui';
import type { User } from '@/types';

export default function AuthScreen() {
  const { setCurrentUser } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!loginUser || !loginPass) return setMsg({ text: 'Please enter complete information', type: 'error' });
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        router.push('/create');
      } else {
        setMsg({ text: data.message || 'Login failed', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Network connection error', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    if (!regUser || !regName || !regPass) return setMsg({ text: 'Please enter all required fields', type: 'error' });
    setMsg(null);
    setLoading(true);
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
        setMsg({ text: '✅ Account created successfully! Logging in...', type: 'success' });
        setTimeout(() => { 
          setCurrentUser(data.data); 
          router.push('/create'); 
        }, 900);
      } else {
        setMsg({ text: data.message || 'Registration failed', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Server connection error', type: 'error' });
    } finally {
      setLoading(false);
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
          <p className="text-blue-100/70 font-medium">Smart shipping platform</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-white/5 rounded-xl mb-8 border border-white/10">
          {(['login', 'register'] as const).map((t, i) => (
            <button key={t} onClick={() => { setTab(t); setMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${tab === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              {i === 0 ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        {msg && <Alert type={msg.type}>{msg.text}</Alert>}

        <div className="animate-slide-up">
          {tab === 'login' ? (
            <div className="space-y-4">
              <Field label="Username">
                <input className={inputCls} placeholder="Enter username..." value={loginUser}
                  onChange={e => setLoginUser(e.target.value)} />
              </Field>
              <Field label="Password">
                <input className={inputCls} type="password" placeholder="••••••••" value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()} />
              </Field>
              <button onClick={doLogin} disabled={loading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading && <Spinner size={16} />}
                Login
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <Field label="Username *">
                <input className={inputCls} placeholder="username" value={regUser} onChange={e => setRegUser(e.target.value)} />
              </Field>
              <Field label="Full Name *">
                <input className={inputCls} placeholder="John Doe" value={regName} onChange={e => setRegName(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" placeholder="email@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </Field>
              <Field label="Password *">
                <input className={inputCls} type="password" placeholder="••••••••" value={regPass} onChange={e => setRegPass(e.target.value)} />
              </Field>
              <Field label="Invite Code (optional)">
                <input className={inputCls} placeholder="Enter invite code" value={regInvite} onChange={e => setRegInvite(e.target.value)} />
              </Field>
              <button onClick={doRegister} disabled={loading}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading && <Spinner size={16} />}
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
