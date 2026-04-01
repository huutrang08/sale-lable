'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { WEIGHT_RANGES } from '@/lib/db';
import { Card, Spinner, Badge } from '@/components/ui';

export default function ServicesTab() {
  const { services, setServices } = useApp();

  React.useEffect(() => {
    if (services.length === 0) {
      fetch('/api/services').then(r => r.json()).then(j => {
        if (j.success) setServices(j.data);
      }).catch(() => {});
    }
  }, [services.length, setServices]);

  return (
    <Card title="🚀 Danh sách dịch vụ & Bảng giá">
      {!services.length ? (
        <div className="text-center py-8 text-gray-300"><Spinner /> Đang tải...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-3 py-2.5 font-bold border-b-2 border-gray-200">ID</th>
                <th className="px-3 py-2.5 font-bold border-b-2 border-gray-200">Tên dịch vụ</th>
                <th className="px-3 py-2.5 font-bold border-b-2 border-gray-200">Thời gian</th>
                {WEIGHT_RANGES.map(r => (
                  <th key={r.id} className="px-3 py-2.5 font-bold border-b-2 border-gray-200 text-center">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((s: any) => {
                return (
                  <tr key={s.id} className="hover:bg-gray-50/70 border-b border-gray-100">
                    <td className="px-3 py-2.5"><Badge variant="pending">{s.id}</Badge></td>
                    <td className="px-3 py-2.5 font-semibold">{s.name}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{s.time || '-'}</td>
                    {WEIGHT_RANGES.map((_, i) => (
                      <td key={i} className="px-3 py-2.5 text-center font-bold text-blue-600">
                        {s.prices && s.prices[i] !== undefined ? `$${parseFloat(s.prices[i]).toFixed(2)}` : '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
