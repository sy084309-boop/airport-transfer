/**
 * 航班即時資料服務 — 使用 TDX Air/FIDS API
 * 端點：
 * - 入境: /api/basic/v2/Air/FIDS/Airport/Arrival/{AirportID}
 * - 出境: /api/basic/v2/Air/FIDS/Airport/Departure/{AirportID}
 */
import https from 'https';

// ---- 設定：3 組 Key 輪流，避免單一 Key 限流 ----
const KEY_POOL = [
  { id: 'sy084309-4142a1e4-2abc-408e', secret: '8731edd6-de41-4b82-bbf8-106b0d6f0364' },
  { id: 'sy084309-22f9c072-0006-4b76', secret: '56c96486-ae7a-4966-9951-0a9b46f631e1' },
  { id: 'sy084309-cafc7872-9f0b-4507', secret: '2dded46466034c283ac0453730d83cf9' },
];
const TDX_BASE = 'tdx.transportdata.tw';

// ---- Token 快取 ----
const tokenCache: Record<string, { token: string; expiry: number }> = {};
let keyIndex = 0;

function rotateKey() {
  keyIndex = (keyIndex + 1) % KEY_POOL.length;
  return KEY_POOL[keyIndex];
}

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const cacheKey = clientId;
  if (tokenCache[cacheKey] && Date.now() < tokenCache[cacheKey].expiry) return tokenCache[cacheKey].token;

  const data = new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret}).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TDX_BASE, path: '/auth/realms/TDXConnect/protocol/openid-connect/token',
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length },
    }, res => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => {
        const json = JSON.parse(body);
        tokenCache[cacheKey] = { token: json.access_token, expiry: Date.now() + (json.expires_in - 300) * 1000 };
        resolve(tokenCache[cacheKey].token);
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function tdxGet(path: string): Promise<any> {
  // 用當前的 Key，若被限流就換下一組重試
  for (let i = 0; i < KEY_POOL.length; i++) {
    const key = rotateKey();
    const token = await getToken(key.id, key.secret);
    const result = await tdxRequest(token, path);
    if (result !== null && !result.message?.includes('rate limit')) return result;
  }
  console.warn('[TDX] All keys exhausted');
  return null;
}

function tdxRequest(token: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: TDX_BASE, path,
      headers: { 'Authorization': `Bearer ${token}` },
    }, res => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.message?.includes('rate limit')) { console.warn('[TDX] Rate limited'); resolve(null); }
          else resolve(json);
        } catch { resolve(null); }
      });
    }).on('error', reject).end();
  });
}

// ---- 類型 ----
export interface FlightInfo {
  flightDate: string;
  flightNumber: string;
  airlineId: string;
  departureAirportId: string;
  arrivalAirportId: string;
  scheduleTime: string;
  actualTime: string | null;
  estimatedTime: string | null;
  remark: string;
  remarkEn: string;
  terminal: string | null;
  gate: string | null;
  isCodeshare: boolean;
  codeshareFlightNumber: string | null;
  status: 'on-time' | 'landed' | 'delayed' | 'cancelled' | 'departed' | 'unknown';
}

function normalizeFlight(raw: any): FlightInfo {
  const remark = raw.DepartureRemark || raw.ArrivalRemark || '';
  const remarkEn = raw.DepartureRemarkEn || raw.ArrivalRemarkEn || '';

  // 判斷狀態
  let status: FlightInfo['status'] = 'unknown';
  if (remark.includes('取消') || remarkEn?.toLowerCase().includes('cancel')) status = 'cancelled';
  else if (remark.includes('延遲') || remarkEn?.toLowerCase().includes('delay')) status = 'delayed';
  else if (remark.includes('已到') || remarkEn?.toLowerCase().includes('arrived')) status = 'landed';
  else if (remark.includes('出發') || remarkEn?.toLowerCase().includes('departed')) status = 'departed';
  else if (remark.includes('準時') || remarkEn?.toLowerCase().includes('on-time') || remarkEn?.toLowerCase().includes('on time')) status = 'on-time';

  // 若沒有 remark 但時間已過 → 標為 on-time
  if (status === 'unknown') {
    const sch = new Date(raw.ScheduleDepartureTime || raw.ScheduleArrivalTime);
    if (sch.getTime() < Date.now()) status = 'departed';
    else status = 'on-time';
  }

  return {
    flightDate: raw.FlightDate,
    flightNumber: raw.FlightNumber,
    airlineId: raw.AirlineID,
    departureAirportId: raw.DepartureAirportID,
    arrivalAirportId: raw.ArrivalAirportID,
    scheduleTime: raw.ScheduleDepartureTime || raw.ScheduleArrivalTime,
    arrivalTime: raw.ScheduleArrivalTime || null,
    actualTime: raw.ActualDepartureTime || raw.ActualArrivalTime || null,
    estimatedTime: raw.EstimatedDepartureTime || raw.EstimatedArrivalTime || null,
    remark,
    remarkEn,
    terminal: raw.Terminal || null,
    gate: raw.Gate || null,
    isCodeshare: raw.IsCodeshare || false,
    codeshareFlightNumber: raw.CodeShareFlightNumber || null,
    status,
  };
}

// ---- 公開 API ----

/** 機場代碼對照 */
export const AIRPORTS: Record<string, string> = {
  'TPE': '臺灣桃園國際機場',
  'TSA': '臺北松山機場',
  'RMQ': '臺中國際機場',
  'KHH': '高雄小港機場',
  'TNN': '臺南航空站',
};

/** 航空公司代碼對照（常用） */
export const AIRLINES: Record<string, string> = {
  'BR': '長榮航空', 'CI': '中華航空', 'JX': '星宇航空',
  'IT': '台灣虎航', 'AE': '華信航空', 'B7': '立榮航空',
  'CX': '國泰航空', 'KE': '大韓航空', 'OZ': '韓亞航空',
  'JL': '日本航空', 'NH': '全日空', 'SQ': '新加坡航空',
  'TG': '泰國航空', 'VN': '越南航空', 'PR': '菲律賓航空',
  'UA': '聯合航空', 'DL': '達美航空', 'AA': '美國航空',
  'CA': '中國國際航空', 'MU': '中國東方航空', 'CZ': '中國南方航空',
  'MF': '廈門航空', 'HO': '吉祥航空', '9C': '春秋航空',
};

export function getAirlineName(id: string): string {
  return AIRLINES[id] || id;
}

export function getAirportName(id: string): string {
  return AIRPORTS[id] || id;
}

// ---- 地端快取（5 分鐘內不重複查 TDX）----
const cacheTTL = 5 * 60 * 1000;
const cache: Record<string, { data: FlightInfo[]; ts: number }> = {};

function withCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < cacheTTL) return Promise.resolve(entry.data as T);
  return fetcher().then(data => { cache[key] = { data: data as any, ts: Date.now() }; return data; });
}

/** 查詢入境航班（含 5 分鐘快取） */
export async function getArrivals(airport: string = 'TPE'): Promise<FlightInfo[]> {
  return withCache(`arr_${airport}`, async () => {
    const data = await tdxGet(`/api/basic/v2/Air/FIDS/Airport/Arrival/${airport}?$top=30&$format=JSON`);
    if (!Array.isArray(data)) throw new Error('Invalid TDX response');
    return data.map(normalizeFlight);
  });
}

/** 查詢出境航班（含 5 分鐘快取） */
export async function getDepartures(airport: string = 'TPE'): Promise<FlightInfo[]> {
  return withCache(`dep_${airport}`, async () => {
    const data = await tdxGet(`/api/basic/v2/Air/FIDS/Airport/Departure/${airport}?$top=30&$format=JSON`);
    if (!Array.isArray(data)) throw new Error('Invalid TDX response');
    return data.map(normalizeFlight);
  });
}

/** 搜尋特定航班（只找不超過 3 個機場，降低 API 呼叫） */
export async function searchFlight(airline: string, flightNumber: string, date?: string): Promise<FlightInfo | null> {
  // 優先找台灣兩大國際機場
  const airports = ['TPE'];
  const searchDate = date || new Date().toISOString().slice(0, 10);

  for (const airport of airports) {
    try {
      const [arr, dep] = await Promise.all([
        tdxGet(`/api/basic/v2/Air/FIDS/Airport/Arrival/${airport}?$top=30&$format=JSON`).catch(() => []),
        tdxGet(`/api/basic/v2/Air/FIDS/Airport/Departure/${airport}?$top=30&$format=JSON`).catch(() => []),
      ]);

      const arrList = Array.isArray(arr) ? arr : [];
      const depList = Array.isArray(dep) ? dep : [];
      const allFlights = [...arrList.map(normalizeFlight), ...depList.map(normalizeFlight)];

      // 找當天航班
      let found = allFlights.find(f => f.airlineId === airline && f.flightNumber === flightNumber && f.flightDate === searchDate);
      if (found) return found;

      // 找前一天航班
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      found = allFlights.find(f => f.airlineId === airline && f.flightNumber === flightNumber && f.flightDate === yesterday);
      if (found) return found;
    } catch { continue; }
  }

  return null;
}

// ---- Schedule 快取（避免重複打同一航班）----
const scheduleCache: Record<string, { data: FlightInfo; expiry: number }> = {};

/** 查詢定期班表（國際線 + 國內線）— 支援未來 1-2 個月，含快取 */
export async function querySchedule(airline: string, flightNumber: string): Promise<FlightInfo | null> {
  const cacheKey = `${airline}${flightNumber}`;
  if (scheduleCache[cacheKey] && Date.now() < scheduleCache[cacheKey].expiry) {
    return scheduleCache[cacheKey].data;
  }

  const tryPath = async (path: string) => {
    try {
      const data = await tdxGet(path);
      if (!Array.isArray(data) || data.length === 0) return null;
      const match = data.find((f: any) =>
        f.AirlineID === airline && f.FlightNumber === flightNumber
      );
      if (!match) return null;
      // 從班表建立 FlightInfo（無即時狀態）
      return {
        flightDate: match.ScheduleStartDate || match.ScheduleDate || '',
        flightNumber: match.FlightNumber,
        airlineId: match.AirlineID,
        departureAirportId: match.DepartureAirportID,
        arrivalAirportId: match.ArrivalAirportID,
        scheduleTime: match.DepartureTime || match.ArrivalTime || '',
        actualTime: null,
        estimatedTime: null,
        remark: '',
        remarkEn: '',
        terminal: match.Terminal || null,
        gate: null,
        isCodeshare: false,
        codeshareFlightNumber: null,
        status: 'on-time' as const, // 定期班表預設準時
      };
    } catch { return null; }
  };

  // 先查國際線
  const intl = await tryPath(`/api/basic/v2/Air/GeneralSchedule/International?$filter=AirlineID eq '${airline}' and FlightNumber eq '${flightNumber}'&$format=JSON`);
  if (intl) {
    scheduleCache[cacheKey] = { data: intl, expiry: Date.now() + 3600000 }; // 快取 1 小時
    return intl;
  }

  // 再查國內線
  const dom = await tryPath(`/api/basic/v2/Air/GeneralSchedule/Domestic?$filter=AirlineID eq '${airline}' and FlightNumber eq '${flightNumber}'&$format=JSON`);
  if (dom) {
    scheduleCache[cacheKey] = { data: dom, expiry: Date.now() + 3600000 };
    return dom;
  }

  return null;
}

/** 搜尋航班（即時 FIDS + 定期班表） */
export async function searchFlightFuture(airline: string, flightNumber: string, date?: string): Promise<FlightInfo | null> {
  // 先查即時 FIDS
  const fidsResult = await searchFlight(airline, flightNumber, date);
  if (fidsResult) return fidsResult;

  // FIDS 沒找到 → 查定期班表（支援未來 1-2 月）
  console.log(`[flight] FIDS not found for ${airline}${flightNumber}, trying schedule...`);
  const scheduleResult = await querySchedule(airline, flightNumber);
  if (scheduleResult) {
    console.log(`[flight] Found in schedule: ${airline}${flightNumber}`);
    // 如果用戶指定了日期，更新 scheduleTime
    if (date && scheduleResult.scheduleTime) {
      const timePart = scheduleResult.scheduleTime.slice(11, 16); // "HH:MM"
      scheduleResult.flightDate = date;
      scheduleResult.scheduleTime = `${date}T${timePart}`;
    }
  }
  return scheduleResult;
}

/** 解析航班編號 (ex: "BR123" → airline="BR", number="123") */
export function parseFlightInput(input: string): { airline: string; flightNumber: string } | null {
  const match = input.trim().toUpperCase().match(/^([A-Z0-9]{2})\s*(\d{1,4})$/);
  if (!match) return null;
  return { airline: match[1], flightNumber: match[2] };
}
