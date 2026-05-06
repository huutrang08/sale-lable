'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Spinner } from '@/components/ui';

export default function Home() {
  const { currentUser, loadingAuth } = useApp();
  const router = useRouter();
  
  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        router.replace('/create');
      } else {
        router.replace('/login');
      }
    }
  }, [loadingAuth, currentUser, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium flex-col gap-4">
      <Spinner size={32} />
      <span>Loading...</span>
    </div>
  );
}
