'use client';
import { useApp } from '@/context/AppContext';
import PricingTab from '@/components/dashboard/PricingTab';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PricingPage() {
  const { currentUser, loadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && currentUser?.role !== 'admin') {
      router.replace('/create');
    }
  }, [loadingAuth, currentUser, router]);

  if (currentUser?.role !== 'admin') return null;

  return <PricingTab />;
}
