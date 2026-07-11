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
const FLIGHT_STATUS_COLOR: Record<string, string> = {
  'on-time': 'bg-green-100 text-green-700',
  landed: 'bg-blue-100 text-blue-700',
  departed: 'bg-blue-100 text-blue-700',
  delayed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-600 line-through',
  unknown: 'bg-gray-100 text-gray-500',
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
      api.get('/bookings'),
      api.get('/admin/flights/overview'),
    ]).then(([kpiRes, bookingRes, flightRes]) => {
      setKpi(kpiRes.data);
      setBookings(bookingRes.data);
      setFlightData(flightRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!user || user.role !== 'admin') return <div className="text-center py-20 text-gray-500">請用管理員帳號登入</div>;

  // Group bookings by flight number
  const flightGroups = flightData?.bookings?.reduce((acc: any, b: any) => {
    const key = b.flight_number || '無航班';
    if (!acc[key]) acc[key] = { bookings: [], flightStatus: b.flightStatus, flightDetail: b.flightDetail };
    acc[key].bookings.push(b);
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-6">🚗 後台管理</h2>
        <nav className="space-y-1 text-sm flex-1">
          <a className={`block py-2 px-3 rounded cursor-pointer ${viewMode==='bookings'?'bg-blue-600':''}`} onClick={()=>setViewMode('bookings')}>📊 訂單儀表板</a>
          <a className={`block py-2 px-3 rounded cursor-pointer ${viewMode==='flights'?'bg-blue-600':''}`} onClick={()=>setViewMode('flights')}>✈️ 航班視圖</a>
          <a className="block py-2 px-3 rounded hover:bg-gray-800">🚙 司機管理</a>
          <a className="block py-2 px-3 rounded hover:bg-gray-800">💼 業務管理</a>
          <a className="block py-2 px-3 rounded hover:bg-gray-800">👥 用戶管理</a>
          <a className="block py-2 px-3 rounded hover:bg-gray-800">💰 定價設定</a>
        </nav>
        <div className="text-xs text-gray-500">{user.fullName} · {user.role}</div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">
          {viewMode === 'bookings' ? '📊 營運儀表板' : '✈️ 航班視圖'}
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <StatCard label="總訂單" value={kpi.totalBookings || 0} color="blue" />
          <StatCard label="總營收" value={`$${(kpi.totalRevenue || 0).toLocaleString()}`} color="green" />
          <StatCard label="線上司機" value={kpi.activeDrivers || 0} color="yellow" />
          <StatCard label="待處理" value={kpi.pendingBookings || 0} color="orange" />
          {flightData && (
            <>
              <StatCard label="🟢 航班正常" value={flightData.stats.onTime + flightData.stats.landed} color="emerald" />
              <StatCard label="🔴 航班延遲" value={flightData.stats.delayed} color="red" />
            </>
          )}
          {!flightData && <StatCard label="航班狀態" value="載入中..." color="gray" />}
          {!flightData && <StatCard label="延遲航班" value="..." color="gray" />}
        </div>

        {/* === BOOKING VIEW === */}
        {viewMode === 'bookings' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b font-medium flex justify-between items-center">
              <span>近期訂單</span>
              <Link to="/" className="text-xs text-blue-600 hover:underline">← 回前台</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-2">參考碼</th>
                    <th className="px-4 py-2">類型</th>
                    <th className="px-4 py-2">航班</th>
                    <th className="px-4 py-2">✈️ 狀態</th>
                    <th className="px-4 py-2">訂單狀態</th>
                    <th className="px-4 py-2">車型</th>
                    <th className="px-4 py-2">金額</th>
                    <th className="px-4 py-2">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 15).map((b: any) => {
                    // Match flight data if available
                    const fd = flightData?.bookings?.find((fb: any) => fb.id === b.id);
                    return (
                      <tr key={b.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{b.reference_code}</td>
                        <td className="px-4 py-2">{b.booking_type}</td>
                        <td className="px-4 py-2">
                          {b.flight_number ? (
                            <button
                              onClick={() => setPopoverFlight(fd?.flightDetail || { flightNumber: b.flight_number, status: fd?.flightStatus || 'unknown' })}
                              className="text-blue-600 hover:underline text-xs font-mono"
                            >
                              {b.flight_number}
                            </button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          {fd ? (
                            <span className={`text-xs px-2 py-1 rounded ${FLIGHT_STATUS_COLOR[fd.flightStatus] || 'bg-gray-100'}`}>
                              {STATUS_ICON[fd.flightStatus]} {STATUS_LABEL[fd.flightStatus]}
                            </span>
                          ) : b.flight_number ? (
                            <span className="text-xs text-gray-400">⚪ 查詢中</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            b.status === 'completed' ? 'bg-green-100 text-green-700' :
                            b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-2">{b.vehicle_type}</td>
                        <td className="px-4 py-2 font-medium">${b.total_price}</td>
                        <td className="px-4 py-2 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
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
            {loading && <div className="text-center py-10 text-gray-400">航班資料載入中...</div>}
            {!loading && Object.keys(flightGroups).length === 0 && (
              <div className="text-center py-10 text-gray-400">目前沒有航班相關的預約</div>
            )}
            {Object.entries(flightGroups).map(([flightNo, group]: [string, any]) => {
              const detail = group.flightDetail;
              return (
                <div key={flightNo} className="bg-white rounded-lg shadow">
                  {/* Flight header */}
                  <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{STATUS_ICON[group.flightStatus]}</span>
                      <span className="font-bold text-lg font-mono">{flightNo}</span>
                      {detail && (
                        <>
                          <span className="text-sm text-gray-500">{detail.airline}</span>
                          <span className="text-sm">🛬 {detail.departureAirport} → 🛫 {detail.arrivalAirport}</span>
                          <span className="text-xs text-gray-400">🏛 {detail.terminal || '?'} | 🚪 {detail.gate || '?'}</span>
                        </>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${FLIGHT_STATUS_COLOR[group.flightStatus] || ''}`}>
                        {STATUS_LABEL[group.flightStatus]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {group.bookings.length} 筆預約
                    </div>
                  </div>
                  {/* Bookings in this flight */}
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2">旅客</th>
                        <th className="px-4 py-2">電話</th>
                        <th className="px-4 py-2">類型</th>
                        <th className="px-4 py-2">車型</th>
                        <th className="px-4 py-2">司機</th>
                        <th className="px-4 py-2">狀態</th>
                        <th className="px-4 py-2">時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.bookings.map((b: any) => (
                        <tr key={b.id} className="border-t hover:bg-blue-50">
                          <td className="px-4 py-2 font-medium">{b.customer_name || '—'}</td>
                          <td className="px-4 py-2 text-xs">{b.customer_phone || '—'}</td>
                          <td className="px-4 py-2 text-xs">{b.booking_type}</td>
                          <td className="px-4 py-2 text-xs">{b.vehicle_type}</td>
                          <td className="px-4 py-2 text-xs">{b.driver_name || <span className="text-orange-500">未指派</span>}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              b.status === 'completed' ? 'bg-green-100 text-green-700' :
                              b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{b.status}</span>
                          </td>
                          <td className="px-4 py-2 text-xs">{b.scheduled_pickup_at?.replace('T',' ')}</td>
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
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setPopoverFlight(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg font-mono">{popoverFlight.flightNumber}</h3>
                <span className={`text-xs px-2 py-1 rounded ${FLIGHT_STATUS_COLOR[popoverFlight.status] || ''}`}>
                  {STATUS_ICON[popoverFlight.status]} {STATUS_LABEL[popoverFlight.status]}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {popoverFlight.airline && <div className="flex justify-between"><span className="text-gray-400">航空公司</span><span className="font-medium">{popoverFlight.airline}</span></div>}
                {popoverFlight.departureAirport && <div className="flex justify-between"><span className="text-gray-400">出發</span><span>{popoverFlight.departureAirport}</span></div>}
                {popoverFlight.arrivalAirport && <div className="flex justify-between"><span className="text-gray-400">抵達</span><span>{popoverFlight.arrivalAirport}</span></div>}
                {popoverFlight.scheduleTime && <div className="flex justify-between"><span className="text-gray-400">表定時間</span><span>{popoverFlight.scheduleTime.replace('T',' ')}</span></div>}
                {popoverFlight.terminal && <div className="flex justify-between"><span className="text-gray-400">航廈</span><span className="font-bold">{popoverFlight.terminal}</span></div>}
                {popoverFlight.gate && <div className="flex justify-between"><span className="text-gray-400">登機門</span><span className="font-bold">{popoverFlight.gate}</span></div>}
                {popoverFlight.remark && <div className="flex justify-between"><span className="text-gray-400">備註</span><span>{popoverFlight.remark}</span></div>}
              </div>
              <button onClick={() => setPopoverFlight(null)} className="mt-4 w-full bg-gray-100 py-2 rounded-lg text-sm hover:bg-gray-200">關閉</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500', green: 'border-green-500', yellow: 'border-yellow-500',
    red: 'border-red-500', orange: 'border-orange-500', emerald: 'border-emerald-500',
    gray: 'border-gray-300',
  };
  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${colorMap[color] || 'border-gray-300'}`}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
