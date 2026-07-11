/**
 * 航班搜尋強化模組
 * 1. TDX API → 2. 航空公司官網爬取 → 3. 時區跨夜偵測
 * 流程追蹤：誰經手 → 誰交辦 → 誰完成 → 誰測試
 */

const AIRLINE_WEBSITES: Record<string, { name: string; url: string; iata: string; flightStatusUrl: string }> = {
  BR: { name: '長榮航空', url: 'https://www.evaair.com', iata: 'BR', flightStatusUrl: 'https://booking.evaair.com/flyeva/EVA/B2C/flight-status.aspx' },
  CI: { name: '中華航空', url: 'https://www.china-airlines.com', iata: 'CI', flightStatusUrl: 'https://www.china-airlines.com/tw/zh/flight-status' },
  JX: { name: '星宇航空', url: 'https://www.starlux-airlines.com', iata: 'JX', flightStatusUrl: 'https://www.starlux-airlines.com/zh-TW/flight-status' },
  IT: { name: '台灣虎航', url: 'https://www.tigerairtw.com', iata: 'IT', flightStatusUrl: 'https://www.tigerairtw.com/zh-tw/flight-status' },
  AE: { name: '華信航空', url: 'https://www.mandarin-airlines.com', iata: 'AE', flightStatusUrl: 'https://www.mandarin-airlines.com/zh-TW/flight-status' },
  B7: { name: '立榮航空', url: 'https://www.uniair.com.tw', iata: 'B7', flightStatusUrl: 'https://www.uniair.com.tw/zh-tw/flight-status' },
  CX: { name: '國泰航空', url: 'https://www.cathaypacific.com', iata: 'CX', flightStatusUrl: 'https://www.cathaypacific.com/cx/zh_TW/book-a-trip/flight-status.html' },
  KE: { name: '大韓航空', url: 'https://www.koreanair.com', iata: 'KE', flightStatusUrl: 'https://www.koreanair.com/global/en/travel/booking/flight-status.html' },
  JL: { name: '日本航空', url: 'https://www.jal.co.jp', iata: 'JL', flightStatusUrl: 'https://www.jal.co.jp/jp/en/dom/flight-status/' },
  NH: { name: '全日空', url: 'https://www.ana.co.jp', iata: 'NH', flightStatusUrl: 'https://www.ana.co.jp/en/jp/reservation/flight-status/' },
  SQ: { name: '新加坡航空', url: 'https://www.singaporeair.com', iata: 'SQ', flightStatusUrl: 'https://www.singaporeair.com/en_UK/tw/travel-info/flight-status/' },
  TG: { name: '泰國航空', url: 'https://www.thaiairways.com', iata: 'TG', flightStatusUrl: 'https://www.thaiairways.com/en_TH/book/flight-status.html' },
};

// 機場時區對照表 (UTC offset)
const AIRPORT_TIMEZONES: Record<string, number> = {
  TPE: 8, TSA: 8, KHH: 8, RMQ: 8, TNN: 8, KNH: 8, MZG: 8, HUN: 8, // 台灣 UTC+8
  NRT: 9, HND: 9, KIX: 9, FUK: 9, CTS: 9, NGO: 9, OKA: 9, // 日本 UTC+9
  ICN: 9, PUS: 9, GMP: 9, // 韓國 UTC+9
  HKG: 8, MFM: 8, // 港澳 UTC+8
  SIN: 8, // 新加坡 UTC+8
  BKK: 7, DMK: 7, HKT: 7, // 泰國 UTC+7
  SGN: 7, HAN: 7, DAD: 7, // 越南 UTC+7
  MNL: 8, CEB: 8, // 菲律賓 UTC+8
  KUL: 8, // 馬來西亞 UTC+8
  CGK: 7, DPS: 8, // 印尼
  LAX: -8, SFO: -8, SEA: -8, JFK: -5, ORD: -6, // 美國
  LHR: 0, CDG: 1, AMS: 1, FRA: 1, // 歐洲
  SYD: 10, MEL: 10, BNE: 10, // 澳洲
  AKL: 12, // 紐西蘭
};

export interface FlightInfo {
  flightNo: string;
  airline: string;
  airlineName: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  departureTimezone: number;
  arrivalTimezone: number;
  crossesMidnight: boolean;
  timezoneDiff: number;
  source: 'tdx' | 'airline_website' | 'manual';
  sourceUrl?: string;
  flightStatusUrl?: string;
  warning?: string;
}

/**
 * 從航班編號解析航空公司代碼
 */
export function parseFlightCode(flightNo: string): string | null {
  const match = flightNo.trim().match(/^([A-Za-z]{2,3})\d+$/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * 獲取航空公司資訊
 */
export function getAirlineInfo(code: string) {
  return AIRLINE_WEBSITES[code] || { name: `航空公司 (${code})`, url: '', iata: code, flightStatusUrl: '' };
}

/**
 * 獲取時區 offset（小時）
 */
export function getTimezone(airportCode: string): number {
  return AIRPORT_TIMEZONES[airportCode.toUpperCase()] ?? 8; // 預設 UTC+8
}

/**
 * 偵測航班是否跨越午夜
 * 考慮起降兩地時區差異
 */
export function detectMidnightCrossing(
  departureTime: Date,
  arrivalTime: Date,
  depTimezone: number,
  arrTimezone: number
): { crossesMidnight: boolean; warning?: string } {
  // 將時間標準化為 UTC
  const depUTC = new Date(departureTime.getTime() - depTimezone * 3600000);
  const arrUTC = new Date(arrivalTime.getTime() - arrTimezone * 3600000);

  // 取得出發地的日期和到達地的日期
  const depLocal = new Date(departureTime);
  const arrLocal = new Date(arrivalTime);

  // 檢查：出發日期 != 到達日期（在各自當地時間下）
  const depDay = depLocal.toISOString().slice(0, 10);
  const arrDay = arrLocal.toISOString().slice(0, 10);

  const crossesMidnight = depDay !== arrDay;

  if (crossesMidnight) {
    const diffDays = Math.round((arrUTC.getTime() - depUTC.getTime()) / 86400000);
    const timezoneDiff = arrTimezone - depTimezone;

    let warning = '';
    if (diffDays < 0) {
      warning = `由於時區差異（${depTimezone > 0 ? '+' : ''}${depTimezone} → ${arrTimezone > 0 ? '+' : ''}${arrTimezone}），到達日期為出發前一天。請確認預約日期是否正確。`;
    } else if (diffDays === 0 && timezoneDiff < 0) {
      warning = `目的地時區比出發地晚 ${Math.abs(timezoneDiff)} 小時，實際飛行跨越午夜。請確認接送日期無誤。`;
    } else {
      warning = `航班跨越午夜（${depDay} → ${arrDay}），請確認您的接送日期無誤。`;
    }

    return { crossesMidnight: true, warning };
  }

  return { crossesMidnight: false };
}

/**
 * 搜尋航空公司官網航班資訊（模擬爬取）
 * 實際部署時可串接航空公司 API 或 Puppeteer 爬取
 */
export async function searchAirlineWebsite(flightNo: string): Promise<FlightInfo | null> {
  const code = parseFlightCode(flightNo);
  if (!code) return null;

  const airline = getAirlineInfo(code);
  if (!airline.url) return null;

  // 注意：此為模擬邏輯。實際應串接各航空公司航班查詢 API
  // 例如長榮：https://booking.evaair.com/flyeva/EVA/B2C/flight-status.aspx
  // 或使用 FlightAware / FlightRadar24 等第三方 API

  console.log(`[FlightSearch] Searching airline website: ${airline.name} for ${flightNo}`);

  // 回傳部分資訊，標記來源為航空公司官網
  return {
    flightNo,
    airline: code,
    airlineName: airline.name,
    departureAirport: '?',
    arrivalAirport: '?',
    departureTime: '',
    arrivalTime: '',
    departureTimezone: 8,
    arrivalTimezone: 8,
    crossesMidnight: false,
    timezoneDiff: 0,
    source: 'airline_website',
    sourceUrl: airline.flightStatusUrl,
    warning: '航空公司官網查詢僅供參考，建議旅客自行確認航班時間。',
  };
}

