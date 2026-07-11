import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    const role = useAuthStore.getState().user?.role;
    if (role === 'admin') nav('/admin/dashboard');
    else nav('/member/dashboard');
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl">&#9992;</Link>
          <h2 className="font-display text-2xl text-ivory mt-3">會員登入</h2>
          <p className="text-fog text-sm mt-1">歡迎回到機場快綫</p>
        </div>
        <div className="glass-card p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="input-premium w-full" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">密碼</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                className="input-premium w-full" placeholder="......" />
            </div>
            <button type="submit"
              className="btn-gold w-full py-3">
              登入
            </button>
          </form>
          <p className="text-center text-sm text-fog mt-5">
            還沒有帳號？<Link to="/register" className="text-gold hover:underline ml-1">註冊</Link>
          </p>
        </div>
        <p className="text-center text-xs text-fog mt-6">
          <Link to="/" className="hover:text-mist transition-colors">← 回首頁</Link>
        </p>
      </div>
    </div>
  );
}
