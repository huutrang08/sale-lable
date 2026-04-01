export interface TopupHistory {
  date: string;
  amount: number;
  after: number;
  note: string;
  by: string;
}

export interface Order {
  id: string;
  username?: string;
  tracking_id: string;
  pdf: string;
  price: number | string;
  service: string;
  service_key: string;
  weight: number | string;
  length: number | string;
  width: number | string;
  height: number | string;
  from_name: string;
  from_address: string;
  from_city: string;
  from_state: string;
  from_zip: string;
  to_name: string;
  to_address: string;
  to_city: string;
  to_state: string;
  to_zip: string;
  created_at: string;
  api_key_label: string;
  raw_response?: unknown;
}

export interface User {
  username: string;
  password: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  balance: number;
  apiKeyId: string | null;
  orders: Order[];
  topup_history: TopupHistory[];
}

export interface ApiKey {
  id: string;
  label: string;
  key: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ServicePrice {
  name: string;
  time: string;
  carrier: string;
  prices: number[];
}

export interface Pricing {
  usps_ground: ServicePrice;
  usps_priority: ServicePrice;
  usps_express: ServicePrice;
  ups_nextday: ServicePrice;
  ups_nextday_early: ServicePrice;
}

export interface Settings {
  master_api: string;
  invite_code: string;
  open_register: boolean;
}

export interface DB {
  settings: Settings;
  users: User[];
  api_keys: ApiKey[];
  pricing: Pricing;
}

export interface ShipService {
  id: string;
  name: string;
  max_weight?: string;
  serviceKey?: string;
  time?: string;
  prices?: number[];
}

export interface OrderPayload {
  label_id: string;
  fromName: string;
  fromCompany: string;
  fromAddress: string;
  fromAddress2: string;
  fromZip: string;
  fromState: string;
  fromCity: string;
  fromCountry: string;
  toName: string;
  toCompany: string;
  toAddress: string;
  toAddress2: string;
  toZip: string;
  toState: string;
  toCity: string;
  toCountry: string;
  weight: number;
  length: number;
  height: number;
  width: number;
  reference_1: string;
  reference_2: string;
  discription: string;
}
