'use client';
import { useApp } from '@/context/AppContext';
import AdminTab from '@/components/dashboard/AdminTab';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { currentUser, loadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && currentUser?.role !== 'admin') {
      router.replace('/create');
    }
  }, [loadingAuth, currentUser, router]);

  if (currentUser?.role !== 'admin') return null;

  return <AdminTab />;
}
