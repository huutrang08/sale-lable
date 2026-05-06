'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Spinner, Toast } from '@/components/ui';
import Topbar from '@/components/dashboard/Topbar';

const TABS = [
  { id: 'create', label: 'Create Label', icon: '➕', adminOnly: false },
  { id: 'import', label: 'Import CSV', icon: '📄', adminOnly: false },
  { id: 'orders', label: 'Orders', icon: '📦', adminOnly: false },
  { id: 'services', label: 'Services', icon: '🚀', adminOnly: false },
  { id: 'admin', label: 'Admin', icon: '👥', adminOnly: true },
  { id: 'apikeys', label: 'Keys', icon: '🔑', adminOnly: true },
  { id: 'pricing', label: 'Pricing', icon: '💲', adminOnly: true },
  { id: 'payment', label: 'Top Up', icon: '💳', adminOnly: false },
  { id: 'settings', label: 'Settings', icon: '⚙️', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  
  const isAdmin = currentUser?.role === 'admin';
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [loadingAuth, currentUser, router]);

  if (loadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium flex-col gap-4">
        <Spinner size={32} />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Topbar />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 z-10 py-8">

        {/* Tab nav - modern pills */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-2 custom-scrollbar animate-fade-in">
          <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/50 flex gap-1.5 shrink-0">
            {visibleTabs.map(t => {
              const isActive = pathname === `/${t.id}` || (pathname === '/' && t.id === 'create');
              return (
                <Link key={t.id} href={`/${t.id}`}
                  className={`flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${isActive ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>
                  <span className="opacity-80 text-base leading-none">{t.icon}</span>
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="animate-slide-up h-[100vh]">
          {children}
        </div>
      </div>
      <Toast />
    </div>
  );
}
