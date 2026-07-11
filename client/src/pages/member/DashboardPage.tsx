import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

export default function MemberDashboard() {
  const { user, logout } = useAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    api.get('/bookings').then(({ data }) => setBookings(data));
  }, []);

  if (!user) return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="text-center">
        <p className="text-mist mb-4">請先登入</p>
        <Link to="/login" className="btn-gold">前往登入</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-charcoal/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="text-2xl">&#9992;</span>
            <span className="font-display text-lg text-gold group-hover:text-gold-light transition-colors">
              機場快綫
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ivory">{user.fullName}</span>
            <button onClick={logout} className="text-fog hover:text-mist transition-colors">登出</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-ivory">我的訂單</h2>
          <Link to="/" className="btn-gold text-sm py-2 px-5">立即預約</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '全部訂單', value: bookings.length },
            { label: '已完成', value: bookings.filter(b => b.status === 'completed').length },
            { label: '進行中', value: bookings.filter(b => !['completed','cancelled'].includes(b.status)).length },
          ].map((s, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-gold">{s.value}</div>
              <div className="text-xs text-fog mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">&#128218;</div>
            <p className="text-mist mb-2">尚無訂單記錄</p>
            <Link to="/" className="text-gold hover:underline text-sm">立即預約第一趟行程</Link>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-mist text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">參考碼</th>
                  <th className="px-4 py-3 text-left">類型</th>
                  <th className="px-4 py-3 text-left">狀態</th>
                  <th className="px-4 py-3 text-left">金額</th>
                  <th className="px-4 py-3 text-left">日期</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-ivory/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link to={`/track/${b.reference_code}`}
                        className="text-gold hover:underline">{b.reference_code}</Link>
                    </td>
                    <td className="px-4 py-3 text-mist">{b.booking_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.status === 'completed' ? 'bg-success/10 text-success border border-success/20' :
                        b.status === 'cancelled' ? 'bg-danger/10 text-danger border border-danger/20' :
                        'bg-alert/10 text-alert border border-alert/20'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-ivory font-medium">NT$ {b.total_price?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 text-xs text-fog">{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-ivory font-medium mb-4">快速操作</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="btn-gold text-sm py-2 px-5">預約接送</Link>
            <Link to="/fare" className="btn-outline text-sm py-2 px-5">查看費用</Link>
            <Link to="/track" className="btn-outline text-sm py-2 px-5">查詢訂單</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
