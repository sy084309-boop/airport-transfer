/**
 * 地理編碼服務 — 支援多種後端切換
 * 預設：Nominatim (OpenStreetMap)，免申請即刻可用
 * 可切換至：TDX Locator API（需申請升級方案）
 */

// ---- 類型定義 ----
export interface GeoResult {
  label: string;        // 顯示用地址
  lat: number;
  lng: number;
  city?: string;        // 縣市
  district?: string;    // 行政區
  road?: string;        // 路名
  postcode?: string;    // 郵遞區號
}

export interface GeocodingProvider {
  name: string;
  geocode(address: string): Promise<GeoResult[]>;
  reverse(lat: number, lng: number): Promise<GeoResult | null>;
}

// ---- Nominatim (OpenStreetMap) ----
const nominatimProvider: GeocodingProvider = {
  name: 'Nominatim',

  async geocode(address: string): Promise<GeoResult[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'tw');
    url.searchParams.set('accept-language', 'zh-TW');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'AirportTransfer/1.0' }
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res.json();

    return (data as any[]).map((item: any) => {
      const parts = item.display_name?.split(',') || [];
      return {
        label: item.display_name || item.name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city: parts.find((p: string) => p.includes('臺') || p.includes('台'))?.trim(),
        district: parts[1]?.trim(),
        road: item.address?.road,
        postcode: item.address?.postcode,
      };
    });
  },

  async reverse(lat: number, lng: number): Promise<GeoResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('accept-language', 'zh-TW');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'AirportTransfer/1.0' }
    });
    if (!res.ok) return null;
    const item = await res.json();
    if (!item?.display_name) return null;

    return {
      label: item.display_name,
      lat, lng,
      city: item.address?.city || item.address?.town,
      district: item.address?.district || item.address?.suburb,
      road: item.address?.road,
      postcode: item.address?.postcode,
    };
  }
};

// ---- TDX Locator（需升級方案才可用）----
let tdxToken: string | null = null;
let tdxClientId = '';
let tdxClientSecret = '';

export function setTDXCredentials(clientId: string, clientSecret: string) {
  tdxClientId = clientId;
  tdxClientSecret = clientSecret;
}

async function getTDXToken(): Promise<string> {
  if (tdxToken) return tdxToken;
  const res = await fetch(
    'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: tdxClientId,
        client_secret: tdxClientSecret,
      }),
    }
  );
  const data = await res.json();
  tdxToken = data.access_token;
  // 23 小時後過期
  setTimeout(() => { tdxToken = null; }, 23 * 60 * 60 * 1000);
  return tdxToken!;
}

const tdxProvider: GeocodingProvider = {
  name: 'TDX',

  async geocode(address: string): Promise<GeoResult[]> {
    const token = await getTDXToken();
    const url = `https://tdx.transportdata.tw/api/basic/v2/Locator/AddressToCoordinate?address=${encodeURIComponent(address)}&$format=JSON`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      label: item.AddressNew || item.AddressOriginal,
      lat: item.Latitude || item.Geometry?.coordinates?.[1],
      lng: item.Longitude || item.Geometry?.coordinates?.[0],
      city: item.City,
      district: item.District,
      road: item.Road,
    }));
  },

  async reverse(lat: number, lng: number): Promise<GeoResult | null> {
    const token = await getTDXToken();
    const url = `https://tdx.transportdata.tw/api/basic/v2/Locator/CoordinateToAddress?latitude=${lat}&longitude=${lng}&$format=JSON`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    return {
      label: item.AddressNew || item.AddressOriginal,
      lat, lng,
      city: item.City,
      district: item.District,
      road: item.Road,
    };
  }
};

// ---- 當前使用的 Provider ----
let currentProvider: GeocodingProvider = nominatimProvider;

export function useProvider(name: 'nominatim' | 'tdx') {
  currentProvider = name === 'tdx' ? tdxProvider : nominatimProvider;
}

export function getCurrentProvider(): string {
  return currentProvider.name;
}

// ---- 公開 API ----
export async function geocodeAddress(address: string): Promise<GeoResult[]> {
  if (!address || address.length < 3) return [];
  return currentProvider.geocode(address);
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  return currentProvider.reverse(lat, lng);
}

/**
 * Haversine 公式計算兩點直線距離（公里）
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 取小數一位
}

/**
 * 根據距離試算車資
 */
export function estimateFare(distanceKm: number, vehicleType: string): number {
  const baseRates: Record<string, { base: number; perKm: number }> = {
    sedan:      { base: 600, perKm: 25 },
    luxury:     { base: 800, perKm: 35 },
    suv:        { base: 800, perKm: 30 },
    van:        { base: 1000, perKm: 35 },
    luxury_van: { base: 1200, perKm: 40 },
    import:     { base: 900, perKm: 35 },
  };
  const rate = baseRates[vehicleType] || baseRates.sedan;
  return Math.max(rate.base, Math.round(rate.base + rate.perKm * Math.max(0, distanceKm - 5)));
}

// ---- OSRM 路徑規劃（實際開車距離 + 預估時間）----
export interface RouteResult {
  distanceKm: number;   // 實際開車距離（公里）
  durationMin: number;  // 預估行車時間（分鐘）
}

/**
 * 使用 OSRM 計算兩點間的實際開車距離與時間
 * 台灣地區亦可使用 OSRM Taiwan 鏡像站
 */
export async function getDrivingRoute(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<RouteResult | null> {
  // OSRM 格式：lng,lat（注意順序！）
  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'AirportTransfer/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,  // 公尺→公里
      durationMin: Math.round(route.duration / 60),                 // 秒→分鐘
    };
  } catch {
    return null;
  }
}
