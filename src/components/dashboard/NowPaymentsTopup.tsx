'use client';

import React, { useState } from 'react';
import { Card, Field, inputCls, Btn, Alert } from '@/components/ui';

export const AVAILABLE_COINS = ["ada", "algo", "ark", "ava", "bat", "bcd", "bch", "bnb", "bnbmainnet", "btc", "btg", "busd", "cro", "dai", "dash", "dgb", "doge", "eth", "fun", "gas", "grs", "gt", "ht", "kmd", "link", "lsk", "ltc", "nano", "neo", "okb", "ont", "pax", "qtum", "rep", "rvn", "stpt", "sxp", "trx", "tusd", "uni", "usdc", "usdt", "usdterc20", "usdttrc20", "vet", "wabi", "waves", "xem", "xlm", "xmr", "xrp", "xtz", "xvg", "xzc", "zec", "zen", "zil"];

export default function NowPaymentsTopup() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usdttrc20');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<{
    pay_address: string;
    pay_amount: number;
    amount_usd: number;
    pay_currency: string;
  } | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 5) {
      return setMsg({ text: '⚠️ Minimum top-up amount is 5 USD', type: 'error' });
    }
    
    setLoading(true);
    setMsg(null);
    setInvoice(null);
    
    try {
      const res = await fetch('/api/user/nowpayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, currency })
      });
      const json = await res.json();
      
      if (json.success) {
        setInvoice(json.data);
      } else {
        setMsg({ text: '❌ ' + json.message, type: 'error' });
      }
    } catch (err) {
      setMsg({ text: '❌ Network connection error', type: 'error' });
    }
    setLoading(false);
  }

  function copyAddress() {
    if (invoice) {
        navigator.clipboard.writeText(invoice.pay_address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        });
    }
  }

  return (
    <Card title="⚡ Automated Crypto Top-up">
      {!invoice ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            The system automatically converts USD to your selected cryptocurrency and updates your balance after a successful payment (Takes varying time depending on network).
          </p>
          <Field label="Top-up Amount (USD)">
            <input 
              type="number" 
              className={inputCls} 
              placeholder="Example: 100" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              min="5"
            />
          </Field>
          <Field label="Select Cryptocurrency">
            <select 
              className={inputCls} 
              value={currency} 
              onChange={e => setCurrency(e.target.value)}
            >
              {AVAILABLE_COINS.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </Field>
          <Btn onClick={handleCreate} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 mt-2">
            {loading ? '⏳ Creating invoice...' : `🚀 Create ${currency.toUpperCase()} Invoice`}
          </Btn>
          {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-5 py-4">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Please Pay</h3>
            <p className="text-sm text-slate-500">Send the exact amount of {invoice.pay_currency.toUpperCase()} to the address below.</p>
          </div>
          
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${invoice.pay_address}`} 
              alt="QR Code" 
              className="w-48 h-48 rounded"
            />
          </div>

          <div className="w-full space-y-3">
            <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Amount to Send ({invoice.pay_currency.toUpperCase()})</div>
                <div className="font-mono text-lg font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-center">
                    {invoice.pay_amount} {invoice.pay_currency.toUpperCase()}
                </div>
            </div>
            
            <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Receiving Address</div>
                <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 break-all">
                    {invoice.pay_address}
                </div>
                <button
                    onClick={copyAddress}
                    title="Copy"
                    className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                    copied
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-500 hover:bg-indigo-100'
                    }`}
                >
                    {copied ? '✓' : '📋'}
                </button>
                </div>
            </div>
          </div>

          <div className="w-full pt-4">
            <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
               ⚠️ Please keep this page open; your balance will be credited automatically once the transaction is CONFIRMED.
            </p>
            <Btn onClick={() => setInvoice(null)} className="w-full border-[1.5px] border-slate-300 text-slate-600 hover:bg-slate-50">
                Reset (Create new invoice)
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
