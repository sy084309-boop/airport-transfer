import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待處理' },
  { key: 'confirmed', label: '已確認' },
  { key: 'in_progress', label: '進行中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const STATUS_CLASS: Record<string, string> = {
  completed: 'bg-success/10 text-success border border-success/20',
  cancelled: 'bg-danger/10 text-danger border border-danger/20',
  pending: 'bg-alert/10 text-alert border border-alert/20',
  confirmed: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  in_progress: 'bg-gold/10 text-gold border border-gold/20',
};

const TYPE_LABEL: Record<string, string> = {
  pickup: '接機', sendoff: '送機', general: '一般', urgent: '急件',
};

export default function MemberDashboard() {
  const { user, logout } = useAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchBookings = useCallback((p: number, status: string) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (status) params.set('status', status);
    api.get(`/bookings?${params}`)
      .then(({ data }) => {
        setBookings(data.data || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || '無法載入訂單，請稍後再試');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchBookings(page, statusFilter);
  }, [page, statusFilter, fetchBookings]);

  const changeStatus = (s: string) => {
    setStatusFilter(s);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

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

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => changeStatus(tab.key)}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                statusFilter === tab.key
                  ? 'bg-gold/20 text-gold border-gold/40'
                  : 'border-white/10 text-mist hover:border-white/20 hover:text-ivory'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full mx-auto mb-4" />
            <p className="text-fog text-sm">載入中...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">&#9888;</div>
            <p className="text-danger mb-2">{error}</p>
            <button onClick={() => fetchBookings(page, statusFilter)}
              className="btn-outline text-sm py-2 px-5">重新載入</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">&#128218;</div>
            <p className="text-mist mb-2">
              {statusFilter ? '此狀態尚無訂單' : '尚無訂單記錄'}
            </p>
            <Link to="/" className="text-gold hover:underline text-sm">立即預約第一趟行程</Link>
          </div>
        ) : (
          <>
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
                      <td className="px-4 py-3 text-mist text-xs">
                        {TYPE_LABEL[b.booking_type] || b.booking_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[b.status] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ivory font-medium">NT$ {b.total_price?.toLocaleString() || '—'}</td>
                      <td className="px-4 py-3 text-xs text-fog">{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 rounded border border-white/10 text-mist hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  上一頁
                </button>
                <span className="text-xs text-fog">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-xs px-3 py-1.5 rounded border border-white/10 text-mist hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  下一頁
                </button>
              </div>
            )}
          </>
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
