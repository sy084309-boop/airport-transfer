import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function FarePage() {
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    api.get('/pricing/rules').then(({ data }) => setRules(data));
  }, []);

  return (
    <div className="min-h-screen bg-obsidian">
      <nav className="border-b border-white/5 bg-charcoal/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><span className="text-2xl">&#9992;</span><span className="font-display text-lg text-gold">機場快綫</span></Link>
          <div className="flex gap-4 text-sm">
            <Link to="/" className="text-mist hover:text-gold transition-colors">首頁</Link>
            <Link to="/fare" className="text-gold font-bold">費用</Link>
            <Link to="/booking" className="text-mist hover:text-gold transition-colors">預約</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="font-display text-2xl text-ivory mb-6">計費方式</h2>

        <div className="glass-card overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-mist text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">路線</th>
                <th className="px-4 py-3 text-left">車型</th>
                <th className="px-4 py-3 text-right">基本費用</th>
                <th className="px-4 py-3 text-right">夜間加成</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r:any, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-ivory/5 transition-colors">
                  <td className="px-4 py-3 text-mist">{r.rule_name}</td>
                  <td className="px-4 py-3 text-mist">{r.vehicle_type}</td>
                  <td className="px-4 py-3 text-right text-ivory font-medium">NT$ {r.base_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-alert">+NT$ {r.night_surcharge?.toLocaleString()}</td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-fog">暫無計費規則</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="glass-card p-4 text-sm space-y-1.5 text-mist">
          <p>夜間加成：23:00 - 06:00 加收夜間加成費用</p>
          <p>多點停靠：每增加一個停靠點加收 NT$200</p>
          <p>舉牌服務：加收 NT$200 / 組</p>
          <p>安全座椅：加收 NT$300 / 座</p>
          <p>以上費用均為含稅價格</p>
        </div>
      </div>
    </div>
  );
}
