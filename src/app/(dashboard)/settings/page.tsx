'use client';
import { useApp } from '@/context/AppContext';
import SettingsTab from '@/components/dashboard/SettingsTab';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { currentUser, loadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && currentUser?.role !== 'admin') {
      router.replace('/create');
    }
  }, [loadingAuth, currentUser, router]);

  if (currentUser?.role !== 'admin') return null;

  return <SettingsTab />;
}
