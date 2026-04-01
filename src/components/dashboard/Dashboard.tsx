'use client';

import React, { lazy, Suspense } from 'react';
import Topbar from './Topbar';
import { useApp } from '@/context/AppContext';
import { Spinner } from '@/components/ui';

const CreateTab = lazy(() => import('./CreateTab'));
const OrdersTab = lazy(() => import('./OrdersTab'));
const ServicesTab = lazy(() => import('./ServicesTab'));
const AdminTab = lazy(() => import('./AdminTab'));
const ApiKeysTab = lazy(() => import('./ApiKeysTab'));
const PricingTab = lazy(() => import('./PricingTab'));
const PaymentTab = lazy(() => import('./PaymentTab'));
const SettingsTab = lazy(() => import('./SettingsTab'));

const TABS = [
  { id: 'create', label: 'Tạo Nhãn', icon: '➕', adminOnly: false },
  { id: 'orders', label: 'Đơn Hàng', icon: '📦', adminOnly: false },
  { id: 'services', label: 'Dịch Vụ', icon: '🚀', adminOnly: false },
  { id: 'admin', label: 'Admin', icon: '👥', adminOnly: true },
  { id: 'apikeys', label: 'Keys', icon: '🔑', adminOnly: true },
  { id: 'pricing', label: 'Giá', icon: '💲', adminOnly: true },
  { id: 'payment', label: 'Nạp Tiền', icon: '💳', adminOnly: false },
  { id: 'settings', label: 'Cài Đặt', icon: '⚙️', adminOnly: true },
];

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4 animate-fade-in">
      <Spinner size={32} />
      <span className="text-sm font-semibold">Đang tải cấu phần...</span>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, activeTab, setActiveTab } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  function renderTab() {
    switch (activeTab) {
      case 'create': return <CreateTab />;
      case 'orders': return <OrdersTab />;
      case 'services': return <ServicesTab />;
      case 'admin': return isAdmin ? <AdminTab /> : null;
      case 'apikeys': return isAdmin ? <ApiKeysTab /> : null;
      case 'pricing': return isAdmin ? <PricingTab /> : null;
      case 'payment': return <PaymentTab isAdmin={isAdmin} />;
      case 'settings': return isAdmin ? <SettingsTab /> : null;
      default: return <CreateTab />;
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Topbar />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 z-10 py-8">

        {/* Tab nav - modern pills */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-2 custom-scrollbar animate-fade-in">
          <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/50 flex gap-1.5 shrink-0">
            {visibleTabs.map(t => {
              const isActive = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${isActive ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>
                  <span className="opacity-80 text-base leading-none">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="animate-slide-up h-[100vh]">
          <Suspense fallback={<LoadingFallback />}>
            {renderTab()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
