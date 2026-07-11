/**
 * 航班自動監控服務
 * - 每 N 分鐘檢查 active 預約的航班狀態
 * - 偵測到延遲/取消 → 自動通知乘客和司機
 * - 獨立執行：npx tsx src/services/flight_monitor.ts
 */
import { Database } from 'better-sqlite3';
import { searchFlight, parseFlightInput, getAirlineName, getAirportName } from './flight.service';
import { db } from '../config/database';

// ---- 狀態管理 ----
const notifiedMap = new Map<string, string>(); // key=booking_id, value=previous_status
const LOG_PREFIX = '[FlightMonitor]';

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString().slice(11,19)} ${msg}`);
}

// ---- Email 通知 ----
let nodemailer: any;
try { nodemailer = require('nodemailer'); } catch { /* optional */ }

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

let transporter: any = null;
function getTransporter() {
  if (!nodemailer) return null;
  if (!transporter && SMTP_CONFIG.auth.user) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
    log('Email transporter ready');
  }
  return transporter;
}

async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) { log(`[SKIP EMAIL] ${subject} → ${to}`); return false; }
  try {
    await t.sendMail({ from: SMTP_CONFIG.auth.user, to, subject, html });
    log(`[EMAIL SENT] ${subject} → ${to}`);
    return true;
  } catch (e: any) {
    log(`[EMAIL FAIL] ${e.message}`);
    return false;
  }
}

// ---- 通知內容 ----
function buildNotification(booking: any, flight: any, type: 'delayed' | 'cancelled'): { subject: string; html: string } {
  const flightNo = `${flight.airlineId}${flight.flightNumber}`;
  const airline = getAirlineName(flight.airlineId);
  const from = getAirportName(flight.departureAirportId);
  const to = getAirportName(flight.arrivalAirportId);

  if (type === 'cancelled') {
    return {
      subject: `⛔ 航班取消通知 - ${flightNo} ${airline}`,
      html: `
        <h2>⛔ 航班取消通知</h2>
        <p>您預約的機場接送相關航班已取消：</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td><b>航班編號</b></td><td>${flightNo} ${airline}</td></tr>
          <tr><td><b>路線</b></td><td>${from} → ${to}</td></tr>
          <tr><td><b>原定時間</b></td><td>${flight.scheduleTime?.replace('T',' ')}</td></tr>
          <tr><td><b>狀態</b></td><td style="color:red;font-weight:bold">已取消</td></tr>
        </table>
        <p style="margin-top:16px"><b>請儘速登入系統修改或取消您的預約。</b></p>
        <p>如有問題請聯繫客服：0906-146-632</p>
      `,
    };
  }

  return {
    subject: `🔴 航班延遲通知 - ${flightNo} ${airline}`,
    html: `
      <h2>🔴 航班延遲通知</h2>
      <p>您預約的機場接送相關航班已延遲：</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td><b>航班編號</b></td><td>${flightNo} ${airline}</td></tr>
        <tr><td><b>路線</b></td><td>${from} → ${to}</td></tr>
        <tr><td><b>原定時間</b></td><td>${flight.scheduleTime?.replace('T',' ')}</td></tr>
        <tr><td><b>預計時間</b></td><td>${flight.estimatedTime?.replace('T',' ') || '未提供'}</td></tr>
        <tr><td><b>狀態</b></td><td style="color:orange;font-weight:bold">${flight.remark || '延遲'}</td></tr>
      </table>
      <p style="margin-top:16px"><b>系統已自動調整您的接送時間。登入查看更新。</b></p>
      <p>如有問題請聯繫客服：0906-146-632</p>
    `,
  };
}

// ---- 主邏輯 ----
export async function runMonitor(): Promise<{ checked: number; alerts: number }> {
  log('開始檢查...');
  let checked = 0;
  let alerts = 0;

  try {
    // 取得所有 active 且有航班編號的預約
    const bookings = db.prepare(`
      SELECT b.*, u.email as customer_email, u.full_name as customer_name,
             d.email as driver_email, d.full_name as driver_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE b.flight_number IS NOT NULL
        AND b.flight_number != ''
        AND b.status NOT IN ('cancelled', 'completed')
        AND b.scheduled_pickup_at > datetime('now', '-6 hours')
      ORDER BY b.scheduled_pickup_at ASC
    `).all() as any[];

    log(`找到 ${bookings.length} 筆 active 航班預約`);

    for (const booking of bookings) {
      checked++;
      const parsed = parseFlightInput(booking.flight_number);
      if (!parsed) continue;

      try {
        const flight = await searchFlight(parsed.airline, parsed.flightNumber, booking.flight_date);
        if (!flight) continue;

        const prevStatus = notifiedMap.get(booking.id);
        const currentStatus = flight.status;

        // 只在狀態改變時通知
        if (currentStatus === prevStatus) continue;

        if (currentStatus === 'cancelled') {
          log(`🚨 航班取消: ${booking.flight_number} (預約 #${booking.reference_code})`);
          const notif = buildNotification(booking, flight, 'cancelled');

          // 通知乘客
          if (booking.customer_email) {
            await sendEmail(booking.customer_email, notif.subject, notif.html);
          }
          // 通知司機
          if (booking.driver_email) {
            await sendEmail(booking.driver_email, `[司機] ${notif.subject}`, notif.html);
          }

          // 更新 booking 狀態
          db.prepare(`UPDATE bookings SET status_note = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(`航班已取消 (${flight.remark})`, booking.id);

          notifiedMap.set(booking.id, currentStatus);
          alerts++;
        } else if (currentStatus === 'delayed') {
          log(`🔴 航班延遲: ${booking.flight_number} (預約 #${booking.reference_code})`);
          const notif = buildNotification(booking, flight, 'delayed');

          if (booking.customer_email) {
            await sendEmail(booking.customer_email, notif.subject, notif.html);
          }
          if (booking.driver_email) {
            await sendEmail(booking.driver_email, `[司機] ${notif.subject}`, notif.html);
          }

          db.prepare(`UPDATE bookings SET status_note = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(`航班延遲 (${flight.remark || flight.estimatedTime})`, booking.id);

          notifiedMap.set(booking.id, currentStatus);
          alerts++;
        } else {
          // 狀態正常，記錄但不通知
          notifiedMap.set(booking.id, currentStatus);
        }
      } catch (e: any) {
        log(`⚠️ 查詢失敗: ${booking.flight_number} - ${e.message}`);
        continue;
      }
    }
  } catch (e: any) {
    log(`❌ 監控執行失敗: ${e.message}`);
  }

  log(`完成: 檢查 ${checked} 筆, 發送 ${alerts} 則通知`);
  return { checked, alerts };
}

// ---- API 觸發端點（放在 admin.routes） ----
export async function triggerMonitor(_req: any, res: any) {
  try {
    const result = await runMonitor();
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// ---- CLI 獨立執行 ----
if (require.main === module) {
  const INTERVAL_MIN = parseInt(process.env.MONITOR_INTERVAL || '2', 10);
  const run = () => {
    const start = Date.now();
    runMonitor()
      .then(({ checked, alerts }) => {
        console.log(`[${new Date().toISOString()}] Checked=${checked} Alerts=${alerts} (${Date.now()-start}ms)`);
      })
      .catch(e => console.error('Monitor error:', e.message));
  };
  console.log(`Flight monitor started (every ${INTERVAL_MIN} min). Press Ctrl+C to stop.`);
  run(); // first run immediately
  setInterval(run, INTERVAL_MIN * 60_000);
}
