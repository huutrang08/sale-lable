'use client';
import { useApp } from '@/context/AppContext';
import PaymentTab from '@/components/dashboard/PaymentTab';

export default function PaymentPage() {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  return <PaymentTab isAdmin={isAdmin} />;
}
