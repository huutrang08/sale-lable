'use client';
import { useApp } from '@/context/AppContext';
import ApiKeysTab from '@/components/dashboard/ApiKeysTab';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ApiKeysPage() {
  const { currentUser, loadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && currentUser?.role !== 'admin') {
      router.replace('/create');
    }
  }, [loadingAuth, currentUser, router]);

  if (currentUser?.role !== 'admin') return null;

  return <ApiKeysTab />;
}
