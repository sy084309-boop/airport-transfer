import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-obsidian/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="text-2xl">&#9992;</span>
            <span className="font-display text-lg text-gold group-hover:text-gold-light transition-colors">
              機場快綫
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/fare" className="text-mist hover:text-gold transition-colors">費用</Link>
            <Link to="/track" className="text-mist hover:text-gold transition-colors">查詢</Link>
            {user ? (
              <>
                <Link to="/member" className="text-mist hover:text-gold transition-colors">我的訂單</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-mist hover:text-gold transition-colors">管理</Link>
                )}
                <button onClick={() => { logout(); nav('/'); }} className="text-fog hover:text-mist transition-colors">
                  登出
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-outline text-sm py-2 px-5">登入</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-charcoal mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-gold font-display text-lg mb-3">機場快綫</h4>
            <p className="text-fog text-sm leading-relaxed">
              台灣 5 大機場專業接送<br />
              24 小時商務接送服務<br />
              即時航班追蹤 · 準點保證
            </p>
          </div>
          <div>
            <h5 className="text-ivory font-medium mb-3 text-sm">服務機場</h5>
            <p className="text-fog text-sm leading-loose">
              桃園 TPE · 松山 TSA<br />
              高雄 KHH · 台中 RMQ<br />
              台南 TNN
            </p>
          </div>
          <div>
            <h5 className="text-ivory font-medium mb-3 text-sm">車型選擇</h5>
            <p className="text-fog text-sm leading-loose">
              豪華轎車 · SUV<br />
              商務廂型 · 尊榮進口<br />
              無障礙專車
            </p>
          </div>
          <div>
            <h5 className="text-ivory font-medium mb-3 text-sm">聯絡我們</h5>
            <p className="text-fog text-sm leading-loose">
              LINE: @airportfrstcar<br />
              電話: 09XX-XXX-XXX<br />
              24hr 客服
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-fog text-xs">
          &copy; 2026 機場快綫 Airport Express Taiwan · 全台專業機場接送
        </div>
      </footer>
    </div>
  );
}
