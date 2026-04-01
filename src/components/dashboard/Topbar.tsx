'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function Topbar() {
  const { currentUser, logout, setActiveTab, activeTab } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm animate-fade-in">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 text-white text-lg">
            🚚
          </div>
          <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight hidden sm:block">
            ShipLabel
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-5">
          {isAdmin && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200/50">
              <span className="font-bold text-orange-600 text-[10px] tracking-widest px-1">ADMIN</span>
              {[
                { label: 'Users', tab: 'admin' },
                { label: 'API Keys', tab: 'apikeys' },
                { label: 'Pricing', tab: 'pricing' },
                { label: 'Settings', tab: 'settings' },
              ].map(({ label, tab }) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${activeTab === tab ? 'bg-orange-500 text-white shadow-sm' : 'text-orange-700/70 hover:bg-orange-100 hover:text-orange-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">{currentUser?.name}</span>
            </div>
            <button onClick={logout}
              className="text-slate-400 hover:text-rose-600 font-medium text-sm transition-colors active:scale-95 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-100">
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Admin menu - only shows if admin and screen is small */}
      {isAdmin && (
        <div className="md:hidden bg-orange-50/80 backdrop-blur border-t border-orange-100 px-4 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="font-bold text-orange-600 text-[10px] tracking-widest whitespace-nowrap">ADMIN</span>
          {[
            { label: 'Users', tab: 'admin' },
            { label: 'API Keys', tab: 'apikeys' },
            { label: 'Pricing', tab: 'pricing' },
            { label: 'Settings', tab: 'settings' },
          ].map(({ label, tab }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${activeTab === tab ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-700 border-orange-200'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
