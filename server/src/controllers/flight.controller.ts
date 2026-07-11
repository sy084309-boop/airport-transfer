import { Request, Response } from 'express';
import {
  getArrivals, getDepartures, searchFlightFuture,
  parseFlightInput, getAirlineName, getAirportName,
  AIRPORTS,
} from '../services/flight.service';
import {
  parseFlightCode, getAirlineInfo, getTimezone,
  detectMidnightCrossing, searchAirlineWebsite,
  type FlightInfo,
} from '../services/flight_search';

/** GET /api/flights/arrivals?airport=TPE */
export async function arrivals(req: Request, res: Response) {
  try {
    const airport = (req.query.airport as string)?.toUpperCase() || 'TPE';
    if (!AIRPORTS[airport]) return res.status(400).json({ error: `不支援的機場代碼: ${airport}` });
    const data = await getArrivals(airport);
    res.json({ count: data.length, airport: AIRPORTS[airport], flights: data });
  } catch (e: any) {
    res.status(502).json({ error: '航班資料取得失敗', detail: e.message });
  }
}

/** GET /api/flights/departures?airport=TPE */
export async function departures(req: Request, res: Response) {
  try {
    const airport = (req.query.airport as string)?.toUpperCase() || 'TPE';
    if (!AIRPORTS[airport]) return res.status(400).json({ error: `不支援的機場代碼: ${airport}` });
    const data = await getDepartures(airport);
    res.json({ count: data.length, airport: AIRPORTS[airport], flights: data });
  } catch (e: any) {
    res.status(502).json({ error: '航班資料取得失敗', detail: e.message });
  }
}

/** GET /api/flights/search?q=BR123 */
export async function search(req: Request, res: Response) {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query) return res.status(400).json({ error: '請提供航班編號，例如 ?q=BR123' });

    const parsed = parseFlightInput(query);
    if (!parsed) return res.status(400).json({ error: '航班格式錯誤，請使用如 BR123 的格式' });

    const flight = await searchFlightFuture(parsed.airline, parsed.flightNumber);
    if (!flight) return res.json({ found: false, query, message: '找不到此航班，請確認航班編號與日期' });

    res.json({
      found: true,
      flight: {
        ...flight,
        airlineName: getAirlineName(flight.airlineId),
        departureAirportName: getAirportName(flight.departureAirportId),
        arrivalAirportName: getAirportName(flight.arrivalAirportId),
      },
    });
  } catch (e: any) {
    res.status(502).json({ error: '航班搜尋失敗', detail: e.message });
  }
}

/** GET /api/flights/validate?q=BR123 */
export async function validate(req: Request, res: Response) {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query) return res.status(400).json({ valid: false, message: '請提供航班編號' });

    const parsed = parseFlightInput(query);
    if (!parsed) return res.json({ valid: false, message: '格式錯誤' });

    const flight = await searchFlightFuture(parsed.airline, parsed.flightNumber);
    if (!flight) return res.json({ valid: false, message: '找不到此航班' });

    res.json({
      valid: true,
      flightNumber: `${flight.airlineId}${flight.flightNumber}`,
      airline: getAirlineName(flight.airlineId),
      departureAirport: getAirportName(flight.departureAirportId),
      arrivalAirport: getAirportName(flight.arrivalAirportId),
      scheduleTime: flight.scheduleTime,
      terminal: flight.terminal,
      gate: flight.gate,
      status: flight.status,
      statusText: flight.remark || flight.status,
    });
  } catch (e: any) {
    res.status(502).json({ valid: false, message: '驗證服務異常' });
  }
}

/** GET /api/flights/validate-enhanced?q=BR123 */
export async function validateEnhanced(req: Request, res: Response) {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query) return res.status(400).json({ valid: false, message: '請提供航班編號' });

    const parsed = parseFlightInput(query);
    if (!parsed) return res.json({ valid: false, message: '格式錯誤' });

    let source: 'tdx' | 'airline_website' | 'manual' = 'tdx';
    let sourceUrl: string | undefined;
    let flight: FlightInfo | null = null;

    // Step 1: 嘗試 TDX API
    const tdxFlight = await searchFlightFuture(parsed.airline, parsed.flightNumber);

    if (tdxFlight) {
      source = 'tdx';
      const depTZ = getTimezone(tdxFlight.departureAirportId || '');
      const arrTZ = getTimezone(tdxFlight.arrivalAirportId || '');

      const scheduleTime = new Date(tdxFlight.scheduleTime);
      // 估算到達時間（起飛時間 + 航班編號中的預設飛行時數）
      const estimatedArrival = new Date(scheduleTime.getTime() + 4 * 3600000); // 預設 4hr

      const midnightCheck = detectMidnightCrossing(scheduleTime, estimatedArrival, depTZ, arrTZ);

      flight = {
        flightNo: `${tdxFlight.airlineId}${tdxFlight.flightNumber}`,
        airline: tdxFlight.airlineId,
        airlineName: getAirlineName(tdxFlight.airlineId),
        departureAirport: tdxFlight.departureAirportId || '?',
        arrivalAirport: tdxFlight.arrivalAirportId || '?',
        departureTime: tdxFlight.scheduleTime,
        arrivalTime: '',
        departureTimezone: depTZ,
        arrivalTimezone: arrTZ,
        crossesMidnight: midnightCheck.crossesMidnight,
        timezoneDiff: arrTZ - depTZ,
        source: 'tdx',
        flightStatusUrl: getAirlineInfo(tdxFlight.airlineId).flightStatusUrl || undefined,
        warning: midnightCheck.warning,
      };
    } else {
      // Step 2: TDX 找不到 → 查航空公司官網
      source = 'airline_website';
      const airlineInfo = getAirlineInfo(parsed.airline || '');
      const flightStatusUrl = airlineInfo.flightStatusUrl || undefined;
      sourceUrl = airlineInfo.url || undefined;

      flight = await searchAirlineWebsite(query);
      if (!flight) {
        flight = {
          flightNo: query.toUpperCase(),
          airline: parsed.airline || '?',
          airlineName: airlineInfo.name || '未知航空',
          departureAirport: '?',
          arrivalAirport: '?',
          departureTime: '',
          arrivalTime: '',
          departureTimezone: 8,
          arrivalTimezone: 8,
          crossesMidnight: false,
          timezoneDiff: 0,
          source: 'manual',
          flightStatusUrl: airlineInfo.flightStatusUrl || undefined,
          warning: `無法從 TDX 及航空公司官網找到 ${query}，請手動確認航班資訊。建議前往 ${airlineInfo.flightStatusUrl || airlineInfo.url || '航空公司官網'} 查詢。`,
        };
      }
    }

    res.json({
      valid: tdxFlight ? true : false,
      source,
      sourceUrl,
      flight,
      midnightWarning: flight.crossesMidnight ? flight.warning : null,
    });
  } catch (e: any) {
    res.status(502).json({ valid: false, message: '驗證服務異常', detail: e.message });
  }
}
