'use client';

import { useApp } from '@/context/AppContext';
import AuthScreen from '@/components/auth/AuthScreen';
import Dashboard from '@/components/dashboard/Dashboard';
import { Toast } from '@/components/ui';

export default function Home() {
  const { currentUser, loadingAuth } = useApp();
  
  if (loadingAuth) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium">Đang kiểm tra bảo mật...</div>;
  }

  return (
    <>
      {currentUser ? <Dashboard /> : <AuthScreen />}
      <Toast />
    </>
  );
}
