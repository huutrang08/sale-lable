'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, Spinner, selectCls, Alert } from '@/components/ui';
import * as XLSX from 'xlsx';

export default function ImportOrdersTab() {
  const { services, setServices, currentUser, updateBalance } = useApp();
  const [loadingSvc, setLoadingSvc] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (services.length === 0) {
      loadServices();
    } else if (!selectedClass) {
      setSelectedClass(services[0]?.id || '');
    }
  }, [services]);

  async function loadServices() {
    setLoadingSvc(true);
    try {
      const res = await fetch('/api/services');
      const json = await res.json();
      if (json.success && json.data) {
        setServices(json.data);
        if (json.data.length > 0) {
          setSelectedClass(json.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSvc(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }

  async function handleProcess() {
    if (!file || !selectedClass) return;
    setErrorMsg('');
    setSuccessMsg('');

    const svc = services.find(s => s.id === selectedClass);
    if (!svc || !svc.prices) {
      setErrorMsg('Invalid service selected');
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];

    if (!rows || rows.length < 2) {
      setErrorMsg('File is empty or invalid. Please ensure it has a header row and data.');
      return;
    }

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const weightIdx = headers.findIndex(h => h === 'weight');
    if (weightIdx === -1) {
      setErrorMsg('Could not find Weight column in Excel file');
      return;
    }

    let totalCost = 0;
    const ordersToProcess = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].map(c => String(c).trim());
      if (cols.length < 5) continue;

      const w = parseFloat(cols[weightIdx]) || 0;
      if (w <= 0) continue;

      let finalPrice = svc.prices[svc.prices.length - 1];
      const weightRanges = [5, 10, 25, 40, 70];
      for (let j = 0; j < weightRanges.length; j++) {
        if (w <= weightRanges[j]) {
          finalPrice = svc.prices[Math.min(j, svc.prices.length - 1)];
          break;
        }
      }

      totalCost += finalPrice;
      ordersToProcess.push(cols);
    }

    if (ordersToProcess.length === 0) {
      setErrorMsg('No valid orders found in the CSV (check weight values).');
      return;
    }

    const currentBal = Number(currentUser?.balance || 0);
    if (totalCost > currentBal) {
      setErrorMsg(`Insufficient balance! Total cost for ${ordersToProcess.length} orders is $${totalCost.toFixed(2)} but your balance is only $${currentBal.toFixed(2)}`);
      return;
    }

    setProcessing(true);
    let successCount = 0;

    // Get saved sender address if any
    const savedAddrJson = localStorage.getItem(`saved_from_addr_${currentUser?.username}`);
    let savedAddr = { fromName: 'Bulk Sender', fromAddress: '123 Main St', fromCity: 'New York', fromState: 'NY', fromZip: '10001' };
    if (savedAddrJson) {
      try {
        const parsed = JSON.parse(savedAddrJson);
        if (parsed.fromName) savedAddr = { ...savedAddr, ...parsed };
      } catch { }
    }

    for (const cols of ordersToProcess) {
      const payload = {
        label_id: selectedClass,
        fromName: savedAddr.fromName,
        fromAddress: savedAddr.fromAddress,
        fromCity: savedAddr.fromCity,
        fromState: savedAddr.fromState,
        fromZip: savedAddr.fromZip,
        fromCountry: 'US',
        toName: cols[0] || '',
        toAddress: cols[2] || '',
        toCompany: cols[3] || '',
        toAddress2: cols[4] || '',
        toCity: cols[5] || '',
        toZip: cols[6] || '',
        toState: cols[7] || '',
        toCountry: 'US',
        weight: parseFloat(cols[8]) || 0,
        length: parseFloat(cols[9]) || 0,
        width: parseFloat(cols[10]) || 0,
        height: parseFloat(cols[11]) || 0,
        discription: cols[12] || '',
        reference_1: cols[13] || '',
        reference_2: cols[14] || ''
      };

      try {
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error('Row failed', e);
      }
    }

    setProcessing(false);
    if (successCount === ordersToProcess.length) {
      setSuccessMsg(`✅ Successfully imported all ${successCount} orders.`);
      setFile(null);
    } else {
      setErrorMsg(`⚠️ Imported ${successCount} out of ${ordersToProcess.length} orders. Check orders list for details.`);
    }
    updateBalance();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Order Bulk CSV</h1>
        <a
          href="/template.xlsx"
          download="template.xlsx"
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          ⬇️ Export File
        </a>
      </div>

      {errorMsg && <Alert type="error" className="mb-4">{errorMsg}</Alert>}
      {successMsg && <Alert type="success" className="mb-4">{successMsg}</Alert>}

      <Card>
        <div className="space-y-8 p-2">
          {/* Step 1 */}
          <div>
            <h2 className="text-xl font-medium text-slate-500 mb-3">
              Step 1: <span className="text-blue-500 font-normal">Select Class</span>
            </h2>
            {loadingSvc ? (
              <div className="flex items-center gap-3 text-slate-400">
                <Spinner size={20} /> Loading services...
              </div>
            ) : (
              <select
                className={selectCls + " w-full max-w-2xl bg-slate-50"}
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2 */}
          <div>
            <h2 className="text-xl font-medium text-slate-500 mb-3">
              Step 2: <span className="text-blue-500 font-normal">File input</span>
            </h2>

            <div className="flex items-center max-w-2xl">
              <label className="flex items-center w-full border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm cursor-pointer hover:border-blue-400 transition-colors focus-within:ring-2 focus-within:ring-blue-500/20">
                <div className="flex-1 px-4 py-2.5 text-sm text-slate-500 truncate bg-transparent outline-none">
                  {file ? file.name : "Choose file"}
                </div>
                <div className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 text-sm font-semibold border-l border-slate-300 transition-colors">
                  Browse
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={handleProcess}
              disabled={!file || !selectedClass || processing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {processing ? <><Spinner size={16} /> Processing...</> : 'Upload & Process'}
            </button>
            {!file && <span className="text-sm text-slate-400 font-medium">Please select a CSV file to continue</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
