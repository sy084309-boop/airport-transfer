import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

const STATUS_ICON: Record<string, string> = {
  'on-time': '🟢', landed: '🟢', departed: '🟢',
  delayed: '🔴', cancelled: '⛔', unknown: '⚪',
};
const STATUS_LABEL: Record<string, string> = {
  'on-time': '準時', landed: '已抵達', departed: '已出發',
  delayed: '延遲', cancelled: '取消', unknown: '未知',
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [kpi, setKpi] = useState<any>({});
  const [bookings, setBookings] = useState<any[]>([]);
  const [flightData, setFlightData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'bookings' | 'flights'>('bookings');
  const [popoverFlight, setPopoverFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/bookings?limit=100'),
      api.get('/admin/flights/overview'),
    ]).then(([kpiRes, bookingRes, flightRes]) => {
      setKpi(kpiRes.data);
      setBookings(bookingRes.data.data || bookingRes.data);
      setFlightData(flightRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!user || user.role !== 'admin') return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <p className="text-mist">請用管理員帳號登入</p>
    </div>
  );

  // Group bookings by flight number
  const flightGroups = flightData?.bookings?.reduce((acc: any, b: any) => {
    const key = b.flight_number || '無航班';
    if (!acc[key]) acc[key] = { bookings: [], flightStatus: b.flightStatus, flightDetail: b.flightDetail };
    acc[key].bookings.push(b);
    return acc;
  }, {}) || {};

  const navItems = [
    { key: 'bookings' as const, icon: '📊', label: '訂單儀表板' },
    { key: 'flights' as const, icon: '✈️', label: '航班視圖' },
  ];

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Sidebar */}
      <aside className="w-60 bg-charcoal/90 backdrop-blur-lg min-h-screen p-4 flex flex-col border-r border-white/5">
        <Link to="/" className="flex items-center gap-2 mb-8 group">
          <span className="text-xl">&#9992;</span>
          <span className="font-display text-gold group-hover:text-gold-light transition-colors">後台管理</span>
        </Link>
        <nav className="space-y-1 text-sm flex-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setViewMode(item.key)}
              className={`w-full text-left py-2 px-3 rounded-lg transition-colors ${
                viewMode === item.key
                  ? 'bg-gold/15 text-gold'
                  : 'text-mist hover:bg-ivory/5 hover:text-ivory'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
          {[
            { icon: '🚙', label: '司機管理' },
            { icon: '💼', label: '業務管理' },
            { icon: '👥', label: '用戶管理' },
            { icon: '💰', label: '定價設定' },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full text-left py-2 px-3 rounded-lg text-mist hover:bg-ivory/5 hover:text-ivory transition-colors text-sm"
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="text-xs text-fog pt-4 border-t border-white/5">
          {user.fullName} · <span className="text-gold">{user.role}</span>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="font-display text-2xl text-ivory mb-6">
          {viewMode === 'bookings' ? '📊 營運儀表板' : '✈️ 航班視圖'}
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <StatCard label="總訂單" value={kpi.totalBookings || 0} />
          <StatCard label="總營收" value={`$${(kpi.totalRevenue || 0).toLocaleString()}`} />
          <StatCard label="線上司機" value={kpi.activeDrivers || 0} />
          <StatCard label="待處理" value={kpi.pendingBookings || 0} />
          {flightData ? (
            <>
              <StatCard label="🟢 航班正常" value={flightData.stats.onTime + flightData.stats.landed} />
              <StatCard label="🔴 航班延遲" value={flightData.stats.delayed} />
            </>
          ) : (
            <>
              <StatCard label="航班狀態" value="—" />
              <StatCard label="延遲航班" value="—" />
            </>
          )}
        </div>

        {/* === BOOKING VIEW === */}
        {viewMode === 'bookings' && (
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
              <span className="text-ivory font-medium">近期訂單</span>
              <Link to="/" className="text-xs text-gold hover:underline">← 回前台</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-mist text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">參考碼</th>
                    <th className="px-4 py-3 text-left">類型</th>
                    <th className="px-4 py-3 text-left">航班</th>
                    <th className="px-4 py-3 text-left">✈️ 狀態</th>
                    <th className="px-4 py-3 text-left">訂單狀態</th>
                    <th className="px-4 py-3 text-left">車型</th>
                    <th className="px-4 py-3 text-left">金額</th>
                    <th className="px-4 py-3 text-left">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 20).map((b: any) => {
                    const fd = flightData?.bookings?.find((fb: any) => fb.id === b.id);
                    return (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-ivory/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gold">{b.reference_code}</td>
                        <td className="px-4 py-3 text-mist text-xs">{b.booking_type}</td>
                        <td className="px-4 py-3">
                          {b.flight_number ? (
                            <button
                              onClick={() => setPopoverFlight(fd?.flightDetail || { flightNumber: b.flight_number, status: fd?.flightStatus || 'unknown' })}
                              className="text-gold hover:underline text-xs font-mono"
                            >
                              {b.flight_number}
                            </button>
                          ) : <span className="text-fog">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {fd ? (
                            <span className={`text-xs px-2 py-1 rounded ${
                              fd.flightStatus === 'on-time' || fd.flightStatus === 'landed' || fd.flightStatus === 'departed'
                                ? 'bg-success/10 text-success' :
                              fd.flightStatus === 'delayed'
                                ? 'bg-danger/10 text-danger' :
                              fd.flightStatus === 'cancelled'
                                ? 'bg-fog/10 text-fog line-through' :
                              'bg-fog/10 text-fog'
                            }`}>
                              {STATUS_ICON[fd.flightStatus]} {STATUS_LABEL[fd.flightStatus]}
                            </span>
                          ) : b.flight_number ? (
                            <span className="text-xs text-fog">⚪ 查詢中</span>
                          ) : <span className="text-fog">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            b.status === 'completed' ? 'bg-success/10 text-success' :
                            b.status === 'cancelled' ? 'bg-danger/10 text-danger' :
                            'bg-alert/10 text-alert'
                          }`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3 text-mist text-xs">{b.vehicle_type}</td>
                        <td className="px-4 py-3 text-ivory font-medium">${b.total_price}</td>
                        <td className="px-4 py-3 text-xs text-fog">{new Date(b.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === FLIGHT VIEW === */}
        {viewMode === 'flights' && (
          <div className="space-y-4">
            {loading && (
              <div className="glass-card p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full mx-auto mb-4" />
                <p className="text-fog text-sm">航班資料載入中...</p>
              </div>
            )}
            {!loading && Object.keys(flightGroups).length === 0 && (
              <div className="glass-card p-12 text-center">
                <p className="text-mist">目前沒有航班相關的預約</p>
              </div>
            )}
            {Object.entries(flightGroups).map(([flightNo, group]: [string, any]) => {
              const detail = group.flightDetail;
              return (
                <div key={flightNo} className="glass-card overflow-hidden">
                  {/* Flight header */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-charcoal/50">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg">{STATUS_ICON[group.flightStatus]}</span>
                      <span className="font-bold text-lg font-mono text-ivory">{flightNo}</span>
                      {detail && (
                        <>
                          <span className="text-sm text-mist">{detail.airline}</span>
                          <span className="text-sm text-mist">🛬 {detail.departureAirport} → 🛫 {detail.arrivalAirport}</span>
                          <span className="text-xs text-fog">🏛 {detail.terminal || '?'} | 🚪 {detail.gate || '?'}</span>
                        </>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        group.flightStatus === 'on-time' || group.flightStatus === 'landed' || group.flightStatus === 'departed'
                          ? 'bg-success/10 text-success' :
                        group.flightStatus === 'delayed'
                          ? 'bg-danger/10 text-danger' :
                        'bg-fog/10 text-fog'
                      }`}>
                        {STATUS_LABEL[group.flightStatus]}
                      </span>
                    </div>
                    <div className="text-xs text-fog">
                      {group.bookings.length} 筆預約
                    </div>
                  </div>
                  {/* Bookings in this flight */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-mist text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">旅客</th>
                        <th className="px-4 py-3 text-left">電話</th>
                        <th className="px-4 py-3 text-left">類型</th>
                        <th className="px-4 py-3 text-left">車型</th>
                        <th className="px-4 py-3 text-left">司機</th>
                        <th className="px-4 py-3 text-left">狀態</th>
                        <th className="px-4 py-3 text-left">時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.bookings.map((b: any) => (
                        <tr key={b.id} className="border-b border-white/5 hover:bg-ivory/5 transition-colors">
                          <td className="px-4 py-3 text-ivory font-medium">{b.customer_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-mist">{b.customer_phone || '—'}</td>
                          <td className="px-4 py-3 text-xs text-mist">{b.booking_type}</td>
                          <td className="px-4 py-3 text-xs text-mist">{b.vehicle_type}</td>
                          <td className="px-4 py-3 text-xs">{b.driver_name || <span className="text-alert">未指派</span>}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              b.status === 'completed' ? 'bg-success/10 text-success' :
                              b.status === 'cancelled' ? 'bg-danger/10 text-danger' :
                              'bg-alert/10 text-alert'
                            }`}>{b.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-fog">{b.scheduled_pickup_at?.replace('T',' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* === Flight Popover Modal === */}
        {popoverFlight && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setPopoverFlight(null)}>
            <div className="bg-charcoal border border-white/10 rounded-xl shadow-2xl p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg font-mono text-ivory">{popoverFlight.flightNumber}</h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  popoverFlight.status === 'on-time' || popoverFlight.status === 'landed' || popoverFlight.status === 'departed'
                    ? 'bg-success/10 text-success' :
                  popoverFlight.status === 'delayed'
                    ? 'bg-danger/10 text-danger' :
                  'bg-fog/10 text-fog'
                }`}>
                  {STATUS_ICON[popoverFlight.status]} {STATUS_LABEL[popoverFlight.status]}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {popoverFlight.airline && <Row label="航空公司" value={popoverFlight.airline} />}
                {popoverFlight.departureAirport && <Row label="出發" value={popoverFlight.departureAirport} />}
                {popoverFlight.arrivalAirport && <Row label="抵達" value={popoverFlight.arrivalAirport} />}
                {popoverFlight.scheduleTime && <Row label="表定時間" value={popoverFlight.scheduleTime.replace('T',' ')} />}
                {popoverFlight.terminal && <Row label="航廈" value={popoverFlight.terminal} bold />}
                {popoverFlight.gate && <Row label="登機門" value={popoverFlight.gate} bold />}
                {popoverFlight.remark && <Row label="備註" value={popoverFlight.remark} />}
              </div>
              <button onClick={() => setPopoverFlight(null)}
                className="mt-4 w-full py-2 rounded-lg text-sm border border-white/10 text-mist hover:bg-ivory/5 transition-colors">
                關閉
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="glass-card p-4">
      <div className="text-xs text-fog">{label}</div>
      <div className="text-2xl font-bold mt-1 text-ivory">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-fog">{label}</span>
      <span className={`text-ivory ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}
