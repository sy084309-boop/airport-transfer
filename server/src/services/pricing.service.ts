import { db } from '../config/database';
import { v4 as uuid } from 'uuid';

interface PriceCalc {
  vehicleType: string; origin: string; dest: string;
  isNight?: boolean; isHoliday?: boolean; extraStops?: number;
}

export function calculatePrice(params: PriceCalc) {
  const { vehicleType, origin, dest, isNight, isHoliday, extraStops = 0 } = params;

  let rule = db.prepare(
    `SELECT * FROM pricing_rules WHERE vehicle_type = ? AND origin_zone = ? AND dest_zone = ? AND is_active = 1 LIMIT 1`
  ).get(vehicleType, origin, dest) as any;

  if (!rule) {
    rule = db.prepare(`SELECT * FROM pricing_rules WHERE vehicle_type = ? AND is_active = 1 LIMIT 1`).get(vehicleType) as any;
    if (!rule) throw new Error('找不到適用的費率規則');
  }

  const basePrice = rule.base_price;
  const nightSurcharge = isNight ? rule.night_surcharge : 0;
  const holidaySurcharge = isHoliday ? rule.holiday_surcharge : 0;
  const extraFee = extraStops * rule.extra_stop_fee;

  return { basePrice, nightSurcharge, holidaySurcharge, extraStopsFee: extraFee,
    totalPrice: basePrice + nightSurcharge + holidaySurcharge + extraFee, matchedRule: rule.rule_name };
}

export function getPricingRules() {
  return db.prepare(`SELECT * FROM pricing_rules WHERE is_active = 1 ORDER BY vehicle_type, origin_zone`).all();
}

// ---- 估價：Geocode + OSRM 路線 + 試算 ----

interface GeoPoint { lat: number; lng: number; label: string; }

/** 台灣主要機場座標 */
const AIRPORT_COORDS: Record<string, GeoPoint> = {
  '臺灣桃園國際機場': { lat: 25.0777, lng: 121.2328, label: '臺灣桃園國際機場' },
  '台灣桃園國際機場': { lat: 25.0777, lng: 121.2328, label: '臺灣桃園國際機場' },
  '桃園機場':         { lat: 25.0777, lng: 121.2328, label: '桃園機場' },
  '桃園機場第一航廈': { lat: 25.0777, lng: 121.2328, label: '桃園機場第一航廈' },
  '桃園機場第二航廈': { lat: 25.0802, lng: 121.2304, label: '桃園機場第二航廈' },
  '臺北松山機場':     { lat: 25.0694, lng: 121.5517, label: '臺北松山機場' },
  '台北松山機場':     { lat: 25.0694, lng: 121.5517, label: '臺北松山機場' },
  '松山機場':         { lat: 25.0694, lng: 121.5517, label: '松山機場' },
  '臺中國際機場':     { lat: 24.2642, lng: 120.6212, label: '臺中國際機場' },
  '台中國際機場':     { lat: 24.2642, lng: 120.6212, label: '臺中國際機場' },
  '台中機場':         { lat: 24.2642, lng: 120.6212, label: '臺中國際機場' },
  '高雄小港機場':     { lat: 22.5769, lng: 120.3496, label: '高雄小港機場' },
  '小港機場':         { lat: 22.5769, lng: 120.3496, label: '高雄小港機場' },
  '高雄機場':         { lat: 22.5769, lng: 120.3496, label: '高雄小港機場' },
  '臺南航空站':       { lat: 22.9502, lng: 120.2062, label: '臺南航空站' },
  '台南航空站':       { lat: 22.9502, lng: 120.2062, label: '臺南航空站' },
  '台南機場':         { lat: 22.9502, lng: 120.2062, label: '臺南航空站' },
};

/** 台灣主要市區預設座標（geocoding fallback） */
const CITY_COORDS: Record<string, GeoPoint> = {
  '臺北':  { lat: 25.0330, lng: 121.5654, label: '臺北市' },
  '台北':  { lat: 25.0330, lng: 121.5654, label: '臺北市' },
  '新北':  { lat: 25.0120, lng: 121.4657, label: '新北市' },
  '桃園':  { lat: 24.9936, lng: 121.3010, label: '桃園市' },
  '臺中':  { lat: 24.1477, lng: 120.6736, label: '臺中市' },
  '台中':  { lat: 24.1477, lng: 120.6736, label: '臺中市' },
  '臺南':  { lat: 22.9999, lng: 120.2269, label: '臺南市' },
  '台南':  { lat: 22.9999, lng: 120.2269, label: '臺南市' },
  '高雄':  { lat: 22.6273, lng: 120.3014, label: '高雄市' },
};

/** 已知地點直接回傳座標，其他走 Nominatim */
function getKnownLocation(address: string): GeoPoint | null {
  // 1. 精確匹配機場
  if (AIRPORT_COORDS[address]) return AIRPORT_COORDS[address];
  // 2. 機場關鍵字部分匹配（只限含"機場"或"航空站"的地址）
  if (address.includes('機場') || address.includes('航空站')) {
    for (const [key, pt] of Object.entries(AIRPORT_COORDS)) {
      if (address.includes(key) || key.includes(address)) return pt;
    }
  }
  // 3. 市區 fallback
  for (const [key, pt] of Object.entries(CITY_COORDS)) {
    if (address.includes(key)) return pt;
  }
  return null;
}

/** 地理編碼（Nominatim） */
async function geocode(address: string): Promise<GeoPoint | null> {
  // 先查 known locations
  const known = getKnownLocation(address);
  if (known) return known;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=tw&accept-language=zh-TW`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AirportTransfer/1.0' } });
    if (!res.ok) return null;
    const data = await res.json() as any[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
  } catch { return null; }
}

/** OSRM 實際開車距離與時間 */
async function getRoute(from: GeoPoint, to: GeoPoint) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AirportTransfer/1.0' } });
    const data = await res.json() as any;
    if (!data.routes?.length) return null;
    return {
      distanceKm: Math.round((data.routes[0].distance / 1000) * 10) / 10,
      durationMin: Math.round(data.routes[0].duration / 60),
    };
  } catch { return null; }
}

/** 依距離 + 車型試算車資 */
function fareByDistance(distanceKm: number, vehicleType: string) {
  const rates: Record<string, { base: number; perKm: number }> = {
    sedan:      { base: 600, perKm: 25 },
    luxury:     { base: 800, perKm: 35 },
    suv:        { base: 800, perKm: 30 },
    van:        { base: 1000, perKm: 35 },
    luxury_van: { base: 1200, perKm: 40 },
    import:     { base: 900, perKm: 35 },
  };
  const r = rates[vehicleType] || rates.sedan;
  const extraKm = Math.max(0, distanceKm - 5);
  return Math.round(r.base + r.perKm * extraKm);
}

export async function estimateRouteAndPrice(params: {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType?: string;
  isNight?: boolean;
  extraStops?: number;
}) {
  const { pickupAddress, dropoffAddress, vehicleType = 'sedan', isNight = false, extraStops = 0 } = params;

  // Geocode 起訖點（先查 known location，再 Nominatim，再 city fallback）
  let [pickup, dropoff] = await Promise.all([geocode(pickupAddress), geocode(dropoffAddress)]);

  // 機場座標強制修正：若地址含機場名稱，直接使用機場座標
  const resolveAirport = (addr: string): GeoPoint | null => {
    const m = (a: string, k: string) => a === k || a.includes(k) || k.includes(a);
    for (const [key, pt] of Object.entries(AIRPORT_COORDS)) {
      if (m(addr, key)) return pt;
    }
    return null;
  };
  if (!pickup || pickup.label?.includes('市')) {
    const ap = resolveAirport(pickupAddress);
    if (ap) pickup = ap;
  }
  if (!dropoff || dropoff.label?.includes('市')) {
    const ap = resolveAirport(dropoffAddress);
    if (ap) dropoff = ap;
  }

  // 最終 fallback
  if (!pickup) pickup = CITY_COORDS['臺北'];
  if (!dropoff) dropoff = CITY_COORDS['桃園'];

  // OSRM 路線
  const route = await getRoute(pickup, dropoff);
  if (!route) {
    // fallback: Haversine
    const R = 6371;
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLng = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((pickup.lat * Math.PI) / 180) * Math.cos((dropoff.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const distKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    const basePrice = fareByDistance(distKm, vehicleType);
    const nightSurcharge = isNight ? 200 : 0;
    const extraStopsFee = extraStops * 200;
    return {
      pickup, dropoff,
      route: { distanceKm: distKm, durationMin: null, method: 'haversine' },
      price: {
        basePrice,
        distanceFee: Math.max(0, basePrice - 600),
        nightSurcharge,
        extraStopsFee,
        totalPrice: basePrice + nightSurcharge + extraStopsFee,
      },
    };
  }

  const basePrice = fareByDistance(route.distanceKm, vehicleType);
  const nightSurcharge = isNight ? 200 : 0;
  const extraStopsFee = extraStops * 200;
  return {
    pickup, dropoff,
    route: { ...route, method: 'osrm' },
    price: {
      basePrice,
      distanceFee: Math.max(0, basePrice - 600),
      nightSurcharge,
      extraStopsFee,
      totalPrice: basePrice + nightSurcharge + extraStopsFee,
    },
  };
}

export function createPricingRule(data: any) {
  const id = uuid();
  db.prepare(`INSERT INTO pricing_rules (id, rule_name, vehicle_type, origin_zone, dest_zone, base_price, night_surcharge, holiday_surcharge, extra_stop_fee)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, data.ruleName, data.vehicleType, data.originZone, data.destZone, data.basePrice, data.nightSurcharge || 0, data.holidaySurcharge || 0, data.extraStopFee || 200);
  return db.prepare(`SELECT * FROM pricing_rules WHERE id = ?`).get(id);
}
