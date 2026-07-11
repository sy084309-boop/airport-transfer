import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const { register } = useAuthStore();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(form);
    nav('/member/dashboard');
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl">&#9992;</Link>
          <h2 className="font-display text-2xl text-ivory mt-3">註冊會員</h2>
          <p className="text-fog text-sm mt-1">加入機場快綫，自動記錄地址與聯絡資料</p>
        </div>
        <div className="glass-card p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">
                姓名 <span className="text-gold">*</span>
              </label>
              <input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                className="input-premium w-full" placeholder="王大明" />
            </div>
            <div>
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">
                Email <span className="text-gold">*</span>
              </label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email"
                className="input-premium w-full" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">電話</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="input-premium w-full" placeholder="0912-345-678" />
            </div>
            <div>
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">
                密碼 <span className="text-gold">*</span>
              </label>
              <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} type="password"
                className="input-premium w-full" placeholder="至少 6 個字元" />
            </div>
            <button type="submit"
              className="btn-gold w-full py-3 mt-2">
              註冊
            </button>
          </form>
          <p className="text-center text-sm text-fog mt-5">
            已有帳號？<Link to="/login" className="text-gold hover:underline ml-1">登入</Link>
          </p>
        </div>
        <p className="text-center text-xs text-fog mt-6">
          <Link to="/" className="hover:text-mist transition-colors">← 回首頁</Link>
        </p>
      </div>
    </div>
  );
}
