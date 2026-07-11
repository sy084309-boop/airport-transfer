import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function TrackPage() {
  const { code } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      api.get(`/bookings/track/${code}`).then(({ data }) => {
        setBooking(data); setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [code]);

  const statusMap: Record<string, string> = {
    pending: '待確認', confirmed: '已確認', assigned: '已派車',
    driver_accepted: '司機已接單', driver_en_route: '司機前往中',
    arrived_at_pickup: '已抵達上車點', in_progress: '行程中',
    completed: '已完成', cancelled: '已取消',
  };

  const statusEmoji: Record<string, string> = {
    pending: '⏳', confirmed: '✅', completed: '✅', cancelled: '❌',
    in_progress: '🟢', assigned: '🚗', driver_en_route: '🚙',
    driver_accepted: '👍', arrived_at_pickup: '📍',
  };

  if (loading) return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center text-fog">載入中...</div>
  );

  return (
    <div className="min-h-screen bg-obsidian">
      <nav className="border-b border-white/5 bg-charcoal/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-3"><span className="text-2xl">&#9992;</span><span className="font-display text-lg text-gold">機場快綫</span></Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">
        <h2 className="font-display text-2xl text-ivory mb-6">訂單追蹤</h2>

        {booking ? (
          <div className="glass-card p-6 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-2">{statusEmoji[booking.status] || '📋'}</div>
              <div className="text-ivory font-medium text-lg">{statusMap[booking.status] || booking.status}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fog mb-0.5">參考碼</div>
              <div className="text-ivory font-mono text-lg font-bold">{booking.reference_code}</div>
            </div>
            <hr className="gold-rule" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-fog mb-0.5">類型</div>
                <div className="text-ivory">{booking.booking_type}</div>
              </div>
              <div>
                <div className="text-xs text-fog mb-0.5">車型</div>
                <div className="text-ivory">{booking.vehicle_type}</div>
              </div>
              <div>
                <div className="text-xs text-fog mb-0.5">上車</div>
                <div className="text-ivory">{booking.pickup_address || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-fog mb-0.5">下車</div>
                <div className="text-ivory">{booking.dropoff_address || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-fog mb-0.5">預約時間</div>
                <div className="text-ivory">{new Date(booking.scheduled_pickup_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-fog mb-0.5">費用</div>
                <div className="text-gold font-bold">NT$ {booking.total_price?.toLocaleString() || '—'}</div>
              </div>
            </div>
            {booking.driver_name && (
              <div className="text-sm text-mist bg-charcoal rounded-lg p-3">
                司機：{booking.driver_name} / {booking.vehicle_plate}
              </div>
            )}
            <div className="text-center pt-2">
              <Link to="/" className="btn-gold text-sm py-2 px-6">預約新行程</Link>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">&#128269;</div>
            <p className="text-mist mb-1">找不到此訂單</p>
            <p className="text-fog text-sm mb-4">請確認參考碼是否正確</p>
            <Link to="/" className="btn-gold text-sm py-2 px-6">返回首頁</Link>
          </div>
        )}
      </div>
    </div>
  );
}
