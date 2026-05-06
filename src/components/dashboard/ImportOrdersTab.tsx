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
  const [verifiedData, setVerifiedData] = useState<{ orders: any[], totalCost: number } | null>(null);

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

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedClass(e.target.value);
    setVerifiedData(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setSuccessMsg('');
      setVerifiedData(null);
    }
  }

  async function handleVerify() {
    if (!file || !selectedClass) return;
    setErrorMsg('');
    setSuccessMsg('');
    setVerifiedData(null);

    const svc = services.find(s => s.id === selectedClass);
    if (!svc || !svc.prices) {
      setErrorMsg('Invalid service selected');
      return;
    }

    try {
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

      const idxFrom = {
        name: headers.indexOf('fromname'),
        addr1: headers.indexOf('street1from'),
        city: headers.indexOf('cityfrom'),
        state: headers.indexOf('statefrom'),
        zip: headers.indexOf('postalcodefrom')
      };

      const idxTo = {
        name: headers.indexOf('toname'),
        addr1: headers.indexOf('street1to'),
        addr2: headers.indexOf('street2to'),
        company: headers.indexOf('companyto'),
        city: headers.indexOf('cityto'),
        state: headers.indexOf('stateto'),
        zip: headers.indexOf('zipto')
      };

      const idxDim = {
        w: headers.indexOf('weight'),
        l: headers.indexOf('length'),
        wd: headers.indexOf('width'),
        h: headers.indexOf('height'),
        desc: headers.indexOf('description'),
        ref1: headers.indexOf('ref01'),
        ref2: headers.indexOf('ref02')
      };

      if (idxDim.w === -1) {
        setErrorMsg('Could not find Weight column in Excel file');
        return;
      }

      let totalCost = 0;
      const ordersToProcess = [];

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].map(c => String(c).trim());
        if (cols.length < 5) continue;

        const w = parseFloat(cols[idxDim.w]) || 0;
        const l = idxDim.l !== -1 ? (parseFloat(cols[idxDim.l]) || 0) : 0;
        const wd = idxDim.wd !== -1 ? (parseFloat(cols[idxDim.wd]) || 0) : 0;
        const h = idxDim.h !== -1 ? (parseFloat(cols[idxDim.h]) || 0) : 0;

        if (w <= 0) continue;

        // Validation for dimension limits to avoid DB numeric overflow
        if (w >= 99999999 || l >= 99999999 || wd >= 99999999 || h >= 99999999) {
          setErrorMsg(`Row ${i + 1}: Contains excessively large weight or dimensions. Please fix the data and try again.`);
          return;
        }

        // Validation for required TO fields
        if (
          (idxTo.name !== -1 && !cols[idxTo.name]) ||
          (idxTo.addr1 !== -1 && !cols[idxTo.addr1]) ||
          (idxTo.city !== -1 && !cols[idxTo.city]) ||
          (idxTo.state !== -1 && !cols[idxTo.state]) ||
          (idxTo.zip !== -1 && !cols[idxTo.zip])
        ) {
          setErrorMsg(`Row ${i + 1}: Missing required recipient information (ToName, Street1To, CityTo, StateTo, or ZipTo).`);
          return;
        }

        let finalPrice = svc.prices[svc.prices.length - 1];
        const weightRanges = [5, 10, 25, 40, 70];
        for (let j = 0; j < weightRanges.length; j++) {
          if (w <= weightRanges[j]) {
            finalPrice = svc.prices[Math.min(j, svc.prices.length - 1)];
            break;
          }
        }

        totalCost += finalPrice;
        ordersToProcess.push({
          fromName: idxFrom.name !== -1 ? cols[idxFrom.name] : '',
          fromAddress: idxFrom.addr1 !== -1 ? cols[idxFrom.addr1] : '',
          fromCity: idxFrom.city !== -1 ? cols[idxFrom.city] : '',
          fromState: idxFrom.state !== -1 ? cols[idxFrom.state] : '',
          fromZip: idxFrom.zip !== -1 ? cols[idxFrom.zip] : '',

          toName: idxTo.name !== -1 ? cols[idxTo.name] : '',
          toAddress: idxTo.addr1 !== -1 ? cols[idxTo.addr1] : '',
          toCompany: idxTo.company !== -1 ? cols[idxTo.company] : '',
          toAddress2: idxTo.addr2 !== -1 ? cols[idxTo.addr2] : '',
          toCity: idxTo.city !== -1 ? cols[idxTo.city] : '',
          toState: idxTo.state !== -1 ? cols[idxTo.state] : '',
          toZip: idxTo.zip !== -1 ? cols[idxTo.zip] : '',

          weight: w,
          length: l,
          width: wd,
          height: h,
          desc: idxDim.desc !== -1 ? cols[idxDim.desc] : '',
          ref1: idxDim.ref1 !== -1 ? cols[idxDim.ref1] : '',
          ref2: idxDim.ref2 !== -1 ? cols[idxDim.ref2] : ''
        });
      }

      if (ordersToProcess.length === 0) {
        setErrorMsg('No valid orders found in the file (check weight values).');
        return;
      }

      const currentBal = Number(currentUser?.balance || 0);
      if (totalCost > currentBal) {
        setErrorMsg(`Insufficient balance! Total cost for ${ordersToProcess.length} orders is $${totalCost.toFixed(2)} but your balance is only $${currentBal.toFixed(2)}`);
        return;
      }

      setVerifiedData({ orders: ordersToProcess, totalCost });
      setSuccessMsg(`Data is valid. Total cost for ${ordersToProcess.length} orders is $${totalCost.toFixed(2)}. Ready to process.`);
    } catch (e) {
      setErrorMsg('Failed to parse file. Ensure it is a valid Excel/CSV file.');
    }
  }

  async function handleProcess() {
    if (!verifiedData) return;
    setErrorMsg('');
    setSuccessMsg('');

    setProcessing(true);
    let successCount = 0;
    const ordersToProcess = verifiedData.orders;

    // Get saved sender address if any
    const savedAddrJson = localStorage.getItem(`saved_from_addr_${currentUser?.username}`);
    let savedAddr = { fromName: 'Bulk Sender', fromAddress: '123 Main St', fromCity: 'New York', fromState: 'NY', fromZip: '10001' };
    if (savedAddrJson) {
      try {
        const parsed = JSON.parse(savedAddrJson);
        if (parsed.fromName) savedAddr = { ...savedAddr, ...parsed };
      } catch { }
    }

    for (const order of ordersToProcess) {
      const payload = {
        label_id: selectedClass,
        fromName: order.fromName || savedAddr.fromName,
        fromAddress: order.fromAddress || savedAddr.fromAddress,
        fromCity: order.fromCity || savedAddr.fromCity,
        fromState: order.fromState || savedAddr.fromState,
        fromZip: order.fromZip || savedAddr.fromZip,
        fromCountry: 'US',
        toName: order.toName,
        toAddress: order.toAddress,
        toCompany: order.toCompany,
        toAddress2: order.toAddress2,
        toCity: order.toCity,
        toZip: order.toZip,
        toState: order.toState,
        toCountry: 'US',
        weight: order.weight,
        length: order.length,
        width: order.width,
        height: order.height,
        discription: order.desc,
        reference_1: order.ref1,
        reference_2: order.ref2
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
      setVerifiedData(null);
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

      {errorMsg && <div className="mb-4"><Alert type="error">{errorMsg}</Alert></div>}
      {successMsg && <div className="mb-4"><Alert type="success">{successMsg}</Alert></div>}

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
                onChange={handleClassChange}
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

          {/* Preview Table */}
          {verifiedData && (
            <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Data Preview ({verifiedData.orders.length} orders)</h3>
                <span className="text-sm font-bold text-blue-600">Total Estimated Cost: ${verifiedData.totalCost.toFixed(2)}</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 sticky top-0 text-slate-500 font-semibold shadow-sm">
                    <tr>
                      <th className="px-4 py-2 border-b border-slate-200">#</th>
                      <th className="px-4 py-2 border-b border-slate-200">Recipient</th>
                      <th className="px-4 py-2 border-b border-slate-200">Address</th>
                      <th className="px-4 py-2 border-b border-slate-200">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {verifiedData.orders.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 w-12">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[150px]">{row.toName || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500 truncate max-w-[300px]">
                          {`${row.toAddress || ''}${row.toCity ? ', ' + row.toCity : ''}${row.toState ? ', ' + row.toState : ''} ${row.toZip || ''}`}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium w-24">{row.weight || '0'} oz</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={handleVerify}
              disabled={!file || !selectedClass || processing || !!verifiedData}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              Verify Data
            </button>
            <button
              onClick={handleProcess}
              disabled={!verifiedData || processing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {processing ? <><Spinner size={16} /> Processing...</> : 'Upload & Process'}
            </button>
            {!file && <span className="text-sm text-slate-400 font-medium">Please select a file to continue</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
