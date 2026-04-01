import type { DB, Pricing } from '@/types';

const DB_KEY = 'sldb_v4';

export const DEFAULT_MASTER_API = '1779|80Ak8rf6cbMTQ2tKgwlLcuayMVQjtXAiLuV0dngN8628a916';
export const API_BASE = 'https://shiplabel.net/api/v2';

export const WEIGHT_RANGES = [
  { id: 'w1', label: '1 - 5 lbs', min: 0.1, max: 5 },
  { id: 'w2', label: '6 - 10 lbs', min: 6, max: 10 },
  { id: 'w3', label: '11 - 25 lbs', min: 11, max: 25 },
  { id: 'w4', label: '26 - 40 lbs', min: 26, max: 40 },
  { id: 'w5', label: '40 - 70 lbs', min: 40, max: 70 },
];

export const DEFAULT_PRICING: Pricing = {
  usps_ground:      { name: 'USPS Ground',           time: '2-5 Business days',        carrier: 'usps', prices: [6, 8, 10, 14, 18] },
  usps_priority:    { name: 'USPS Priority',          time: '1-3 Business days',        carrier: 'usps', prices: [7, 9, 14, 18, 24] },
  usps_express:     { name: 'USPS Express',           time: 'Next day to 2 day',        carrier: 'usps', prices: [9, 12, 16, 22, 26] },
  ups_nextday:      { name: 'UPS Next Day',           time: 'Overnight by 9:00 pm',     carrier: 'ups',  prices: [10, 15, 18, 24, 30] },
  ups_nextday_early:{ name: 'UPS Next Day Early/Sat', time: 'Overnight by 11:00 am',    carrier: 'ups',  prices: [14, 18, 24, 28, 35] },
};

export const SERVICE_API_MAP: Record<string, string> = {
  usps_ground: '201',
  usps_priority: '245',
  usps_express: '115',
  ups_nextday: '357',
  ups_nextday_early: '358',
};

export function getDB(): DB {
  if (typeof window === 'undefined') return createDefaultDB();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) return parsed;
    }
  } catch {}
  return initDB();
}

export function saveDB(db: DB): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function createDefaultDB(): DB {
  return {
    settings: { master_api: DEFAULT_MASTER_API, invite_code: 'SHIP', open_register: false },
    users: [{
      username: 'admin', password: btoa('admin'), name: 'Administrator',
      email: 'admin@shiplabel.net', role: 'admin', balance: 0,
      apiKeyId: null, orders: [], topup_history: [],
    }],
    api_keys: [],
    pricing: JSON.parse(JSON.stringify(DEFAULT_PRICING)),
  };
}

export function initDB(): DB {
  const db = createDefaultDB();
  saveDB(db);
  return db;
}

export function getMasterKey(): string {
  const db = getDB();
  return db.settings?.master_api || DEFAULT_MASTER_API;
}

export function getApiKeyForUser(username: string): string {
  const db = getDB();
  const user = db.users.find(u => u.username === username);
  if (!user) return getMasterKey();
  if (user.apiKeyId) {
    const k = db.api_keys.find(k => k.id === user.apiKeyId && k.status === 'active');
    if (k) return k.key;
  }
  return getMasterKey();
}

export function getApiKeyLabelForUser(username: string): string {
  const db = getDB();
  const user = db.users.find(u => u.username === username);
  if (!user) return 'Master Key';
  if (user.apiKeyId) {
    const k = db.api_keys.find(k => k.id === user.apiKeyId && k.status === 'active');
    if (k) return k.label;
  }
  return 'Master Key';
}

export function maskKey(key: string): string {
  if (!key || key.length < 10) return key || '—';
  return key.substring(0, 6) + '••••••••' + key.slice(-4);
}

export function getPricingDB(): Pricing {
  const db = getDB();
  return db.pricing || JSON.parse(JSON.stringify(DEFAULT_PRICING));
}

export function calcPrice(serviceKey: string, weight: number): number | null {
  const pricing = getPricingDB();
  const svc = pricing[serviceKey as keyof Pricing];
  if (!svc) return null;
  for (let i = 0; i < WEIGHT_RANGES.length; i++) {
    const r = WEIGHT_RANGES[i];
    if (weight >= r.min && weight <= r.max) return svc.prices[i] || 0;
  }
  return svc.prices[WEIGHT_RANGES.length - 1] || 0;
}

export function getServiceKeyByApiId(apiId: string): string | null {
  for (const [key, id] of Object.entries(SERVICE_API_MAP)) {
    if (id === String(apiId)) return key;
  }
  return null;
}

export function getPriceForOrder(apiLabelId: string, weight: number): number | null {
  const sk = getServiceKeyByApiId(apiLabelId);
  if (!sk) return null;
  return calcPrice(sk, weight);
}

// Response parsing helpers
export function findPdfInObject(obj: unknown, depth = 0): string {
  if (!obj || typeof obj !== 'object' || depth > 5) return '';
  const o = obj as Record<string, unknown>;
  const pdfFields = ['pdf', 'pdf_url', 'label_url', 'labelUrl', 'label_pdf', 'file', 'download_url'];
  for (const f of pdfFields) {
    if (o[f] && typeof o[f] === 'string' && (o[f] as string).length > 10) return o[f] as string;
  }
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object') {
      const found = findPdfInObject(val, depth + 1);
      if (found) return found;
    }
  }
  return '';
}

export function findTrackingInObject(obj: unknown, depth = 0): string {
  if (!obj || typeof obj !== 'object' || depth > 5) return '';
  const o = obj as Record<string, unknown>;
  const trackFields = ['tracking_id', 'trackingId', 'tracking', 'TrackingId', 'trackingNumber',
    'tracking_number', 'TrackingNumber', 'barcode', 'label_id'];
  for (const f of trackFields) {
    if (o[f] && typeof o[f] === 'string' && (o[f] as string).length > 3) return o[f] as string;
  }
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object') {
      const found = findTrackingInObject(val, depth + 1);
      if (found) return found;
    }
  }
  return '';
}

export function isResponseSuccess(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const j = json as Record<string, unknown>;
  if (j.success === true || j.success === 'true') return true;
  if (j.status === true || j.status === 'true') return true;
  if (j.status === 'success' || j.status === 'ok') return true;
  if (j.status === 200 || j.code === 200 || j.code === 0) return true;
  if (j.error === false || j.error === 0 || j.error === null) return true;
  if (findPdfInObject(json)) return true;
  if (findTrackingInObject(json)) return true;
  return false;
}
