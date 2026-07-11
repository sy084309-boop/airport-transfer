import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { geocodeAddress, calculateDistance, estimateFare, getDrivingRoute, type GeoResult } from '../../services/geocoding';
import AddressInput from '../../components/booking/AddressInput';
import FlightValidator from '../../components/booking/FlightValidator';
import VehiclePicker from '../../components/booking/VehiclePicker';
import PriceCard from '../../components/booking/PriceCard';
import { useAuthStore } from '../../store/authStore';

const AIRPORTS = ['臺灣桃園國際機場', '臺北松山機場', '臺中國際機場', '高雄小港機場', '臺南航空站'];
const VEHICLES = [
  { value: 'sedan', label: '舒適五人座' },
  { value: 'luxury', label: '豪華五人座' },
  { value: 'suv', label: '舒適七人座' },
  { value: 'van', label: '舒適九人座' },
  { value: 'luxury_van', label: '豪華九人座' },
  { value: 'import', label: '進口五人座' },
];
const HOURS = Array.from({length:24}, (_,i) => String(i).padStart(2,'0'));
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

export default function HomePage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<'pickup'|'sendoff'|'general'>('pickup');
  const [airport, setAirport] = useState(AIRPORTS[0]);
  const [dest, setDest] = useState('');
  const [mode, setMode] = useState<'flight'|'time'>('flight');
  const [flightNo, setFlightNo] = useState('');
  const [date, setDate] = useState('');
  const d = new Date();
  const [year, setYear] = useState(d.getFullYear());
  const [month, setMonth] = useState(String(d.getMonth()+1).padStart(2,'0'));
  const [day, setDay] = useState(String(d.getDate()).padStart(2,'0'));
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [vehicle, setVehicle] = useState('sedan');
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [signboard, setSignboard] = useState(false);
  const [signboardTitle, setSignboardTitle] = useState('');
  const [signboardContent, setSignboardContent] = useState('');
  const [signboard2, setSignboard2] = useState(false);
  const [signboard2Title, setSignboard2Title] = useState('');
  const [signboard2Content, setSignboard2Content] = useState('');
  const [childSeat, setChildSeat] = useState(false);
  const [addrCount, setAddrCount] = useState(1);
  const [destAddrCount, setDestAddrCount] = useState(1);
  const [showContact, setShowContact] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const user = useAuthStore(s => s.user);
  const recentAddresses = useAuthStore(s => s.recentAddresses);
  const fetchRecentAddresses = useAuthStore(s => s.fetchRecentAddresses);

  // 會員登入後自動填入 + 載入最近地址
  useEffect(() => {
    if (user) {
      if (!name && user.fullName) setName(user.fullName);
      if (!phone && user.phone) setPhone(user.phone);
      if (!email && user.email) setEmail(user.email);
      fetchRecentAddresses();
    }
  }, [user]);

  const [price, setPrice] = useState<number|null>(null);
  const [calculating, setCalculating] = useState(false);
  const [duration, setDuration] = useState('??');

  const handleFlightValid = (info: any) => {
    if (info?.scheduleTime) {
      const dt = new Date(info.scheduleTime);
      setYear(dt.getFullYear());
      setMonth(String(dt.getMonth()+1).padStart(2,'0'));
      setDay(String(dt.getDate()).padStart(2,'0'));
      const h = dt.getHours();
      const m = dt.getMinutes();
      if (tab === 'pickup') {
        const t = new Date(dt.getTime() - 40*60000);
        setHour(String(t.getHours()).padStart(2,'0'));
        setMinute(String(Math.floor(t.getMinutes()/5)*5).padStart(2,'0'));
      } else if (tab === 'sendoff') {
        const t = new Date(dt.getTime() - 3*3600000);
        setHour(String(Math.max(0,t.getHours())).padStart(2,'0'));
        setMinute(String(Math.floor(t.getMinutes()/5)*5).padStart(2,'0'));
      }
    }
  };

  const calcPrice = async () => {
    setCalculating(true);
    try {
      let from = tab === 'pickup' ? airport : dest;
      let to = tab === 'pickup' ? dest : airport;
      if (!from || !to) { setCalculating(false); return; }
      const [geoFrom, geoTo] = await Promise.all([geocodeAddress(from), geocodeAddress(to)]);
      if (!geoFrom || !geoTo) { setCalculating(false); return; }
      const dist = calculateDistance(geoFrom.lat, geoFrom.lon, geoTo.lat, geoTo.lon);
      const fare = estimateFare(dist, vehicle);
      setPrice(fare);
      try {
        const route = await getDrivingRoute(geoFrom.lat, geoFrom.lon, geoTo.lat, geoTo.lon);
        if (route?.duration_min != null) setDuration(String(route.duration_min));
      } catch {}
    } catch { setPrice(null); }
    setCalculating(false);
  };

  const submit = async () => {
    if (!name || !phone || !email) { alert('請填寫必填欄位（姓名、手機、信箱）'); return; }
    try {
      const from = tab === 'pickup' ? airport : dest;
      const to = tab === 'pickup' ? dest : airport;
      const datetime = `${year}-${month}-${day}T${hour}:${minute}:00`;
      const res = await api.post('/bookings', {
        type: tab, from_address: from, to_address: to,
        vehicle_type: vehicle, passengers, luggage,
        flight_number: flightNo || undefined,
        pickup_time: datetime,
        contact_name: name, contact_phone: phone, contact_email: email,
        signboard: signboard ? { title: signboardTitle, content: signboardContent } : undefined,
        signboard2: signboard2 ? { title: signboard2Title, content: signboard2Content } : undefined,
        child_seat: childSeat,
        price: price ?? undefined,
      });
      alert('預約成功！');
      nav(`/track?bookingId=${res.data.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.error || '預約失敗，請稍後再試');
    }
  };

  const tabLabel = tab === 'pickup' ? '接機' : tab === 'sendoff' ? '送機' : '一般接送';

  return (
    <div className="min-h-screen bg-obsidian">
      {/* === Hero === */}
      <section className="relative overflow-hidden pt-20 pb-12 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-gold/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-gold/2 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="gold-rule-left mx-auto mb-6" />
          <h1 className="font-display text-4xl md:text-5xl text-ivory tracking-wide mb-4 animate-fade-up">
            機場快綫
          </h1>
          <p className="text-mist text-lg mb-2 animate-fade-up" style={{animationDelay:'0.15s'}}>
            台灣 5 大機場 · 專業接送 · 即時航班追蹤
          </p>
          <p className="text-fog text-sm animate-fade-up" style={{animationDelay:'0.3s'}}>
            24 小時商務接送服務 &nbsp;|&nbsp; 合法登記車輛 &nbsp;|&nbsp; 乘客險保障
          </p>
        </div>
      </section>

      {/* === Booking Form === */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <div className="glass-card p-6 md:p-8 animate-pulse-glow">

          {/* Tabs */}
          <div className="flex gap-1 bg-ash/50 rounded-xl p-1 mb-6">
            {(['pickup','sendoff','general'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-gold text-obsidian' : 'text-mist hover:text-ivory'
                }`}>
                {{pickup:'🛬 接機',sendoff:'🛫 送機',general:'🚗 一般接送'}[t]}
              </button>
            ))}
          </div>

          {/* Airport + Address — 接機：機場→地址 / 送機：地址→機場 / 一般：無機場 */}
          {/* 送機：地址先 */}
          {tab === 'sendoff' && (
            <div className="mb-4">
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">上車地址</label>
              <AddressInput value={dest} onChange={setDest} onSelect={() => {}} />
              <div className="mt-2 space-y-2">
                {Array.from({length: addrCount - 1}, (_, i) => (
                  <input key={i} className="input-premium w-full text-sm" placeholder={`上車地址 ${i + 2}`} />
                ))}
                <div className="flex gap-2">
                  {addrCount < 4 && (<button type="button" onClick={() => setAddrCount(c => c + 1)} className="text-xs text-gold hover:underline">+ 新增上車地址</button>)}
                  {addrCount > 1 && (<button type="button" onClick={() => setAddrCount(1)} className="text-xs text-fog hover:underline">- 收起</button>)}
                </div>
              </div>
            </div>
          )}

          {/* 接機/送機：機場 */}
          {tab !== 'general' && (
            <div className="mb-4">
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">服務機場</label>
              <select value={airport} onChange={e => setAirport(e.target.value)} className="input-premium w-full">
                {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {/* 接機：地址在機場後 */}
          {tab === 'pickup' && (
            <div className="mb-4">
              <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">目的地地址</label>
              <AddressInput value={dest} onChange={setDest} onSelect={() => {}} />
              <div className="mt-2 space-y-2">
                {Array.from({length: destAddrCount - 1}, (_, i) => (
                  <input key={i} className="input-premium w-full text-sm" placeholder={`目的地地址 ${i + 2}`} />
                ))}
                <div className="flex gap-2">
                  {destAddrCount < 4 && (<button type="button" onClick={() => setDestAddrCount(c => c + 1)} className="text-xs text-gold hover:underline">+ 新增目的地</button>)}
                  {destAddrCount > 1 && (<button type="button" onClick={() => setDestAddrCount(1)} className="text-xs text-fog hover:underline">- 收起</button>)}
                </div>
              </div>
            </div>
          )}

          {/* 一般接送：4出發地 + 4目的地 */}
          {tab === 'general' && (
            <>
              <div className="mb-4">
                <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">出發地</label>
                {Array.from({length: addrCount}, (_, i) => (
                  <input key={i} className="input-premium w-full text-sm mb-1.5" placeholder={`出發地址 ${i + 1}`} />
                ))}
                <div className="flex gap-2">
                  {addrCount < 4 && (<button type="button" onClick={() => setAddrCount(c => c + 1)} className="text-xs text-gold hover:underline">+ 新增出發地</button>)}
                  {addrCount > 1 && (<button type="button" onClick={() => setAddrCount(1)} className="text-xs text-fog hover:underline">- 收起</button>)}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">目的地</label>
                {Array.from({length: destAddrCount}, (_, i) => (
                  <input key={i} className="input-premium w-full text-sm mb-1.5" placeholder={`目的地地址 ${i + 1}`} />
                ))}
                <div className="flex gap-2">
                  {destAddrCount < 4 && (<button type="button" onClick={() => setDestAddrCount(c => c + 1)} className="text-xs text-gold hover:underline">+ 新增目的地</button>)}
                  {destAddrCount > 1 && (<button type="button" onClick={() => setDestAddrCount(1)} className="text-xs text-fog hover:underline">- 收起</button>)}
                </div>
              </div>
            </>
          )}

          {/* Mode Toggle */}
          <div className="mb-4">
            <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">預約方式</label>
            <div className="flex gap-1 bg-ash/50 rounded-lg p-1 w-fit">
              <button onClick={() => setMode('flight')}
                className={`px-4 py-2 rounded-md text-sm transition-all ${mode === 'flight' ? 'bg-gold/20 text-gold' : 'text-mist hover:text-ivory'}`}>
                &#9992; 依航班
              </button>
              <button onClick={() => setMode('time')}
                className={`px-4 py-2 rounded-md text-sm transition-all ${mode === 'time' ? 'bg-gold/20 text-gold' : 'text-mist hover:text-ivory'}`}>
                &#128338; 指定時間
              </button>
            </div>
          </div>

          {/* Flight + Terminal */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <FlightValidator flightNo={flightNo} onChange={setFlightNo} onValid={handleFlightValid} />
            </div>
            <div className="w-32">
              <label className="block text-xs text-mist mb-1.5">航廈</label>
              <select className="input-premium w-full text-sm">
                <option value="">請選擇</option>
                {airport.includes('桃園') ? (
                  <><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option></>
                ) : (
                  <><option value="domestic">國內</option><option value="international">國際</option></>
                )}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="mb-4">
            <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">
              {mode === 'flight' ? '航班日期' : '乘車日期'}
            </label>
            <div className="flex gap-1.5 items-center">
              <div className="flex items-center bg-charcoal rounded-lg border border-white/5">
                <button type="button" onClick={() => setYear(y => y-1)} className="px-3 py-2 text-fog hover:text-ivory text-sm">&larr;</button>
                <span className="px-2 text-sm font-medium">{year}年</span>
                <button type="button" onClick={() => setYear(y => y+1)} className="px-3 py-2 text-fog hover:text-ivory text-sm">&rarr;</button>
              </div>
              <select value={month} onChange={e => setMonth(e.target.value)} className="input-premium w-20 text-sm">
                {Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(m=><option key={m} value={m}>{m}月</option>)}
              </select>
              <select value={day} onChange={e => setDay(e.target.value)} className="input-premium w-20 text-sm">
                {Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=><option key={d} value={d}>{d}日</option>)}
              </select>
            </div>
          </div>

          {/* Time */}
          <div className="mb-4">
            <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">預約時間</label>
            <div className="flex gap-1.5">
              <select value={hour} onChange={e=>setHour(e.target.value)} className="input-premium w-20 text-sm">
                {HOURS.map(h=><option key={h} value={h}>{h}時</option>)}
              </select>
              <select value={minute} onChange={e=>setMinute(e.target.value)} className="input-premium w-20 text-sm">
                {MINUTES.map(m=><option key={m} value={m}>{m}分</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle */}
          <VehiclePicker value={vehicle} onChange={setVehicle}
            passengers={passengers} onPassengersChange={setPassengers}
            luggage={luggage} onLuggageChange={setLuggage} />

          {/* Add-ons */}
          <div className="mb-4">
            <label className="block text-xs text-mist mb-2 uppercase tracking-wider">加值服務</label>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-ivory/80">
                <input type="checkbox" checked={signboard} onChange={e=>setSignboard(e.target.checked)}
                  className="accent-gold" />
                舉牌服務 +$200
              </label>
              {signboard && (
                <div className="ml-6 space-y-2">
                  <input value={signboardTitle} onChange={e=>setSignboardTitle(e.target.value)}
                    className="input-premium w-full text-sm" placeholder="舉牌文字主題" />
                  <input value={signboardContent} onChange={e=>setSignboardContent(e.target.value)}
                    className="input-premium w-full text-sm" placeholder="舉牌內容" />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-ivory/80">
                <input type="checkbox" checked={signboard2} onChange={e=>setSignboard2(e.target.checked)}
                  className="accent-gold" />
                第二組舉牌 +$200
              </label>
              {signboard2 && (
                <div className="ml-6 space-y-2">
                  <input value={signboard2Title} onChange={e=>setSignboard2Title(e.target.value)}
                    className="input-premium w-full text-sm" placeholder="舉牌文字主題" />
                  <input value={signboard2Content} onChange={e=>setSignboard2Content(e.target.value)}
                    className="input-premium w-full text-sm" placeholder="舉牌內容" />
                </div>
              )}
              <button type="button" onClick={()=>setShowServices(!showServices)}
                className="text-gold text-sm hover:underline">
                {showServices ? '▲ 收起' : '▼ 更多加值服務'}
              </button>
              {showServices && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    {label:'嬰兒座椅(0-1歲) +$200', opts:['1','2','3']},
                    {label:'兒童座椅(1-4歲) +$200', opts:['1','2','3']},
                    {label:'增高座墊(4-8歲) +$150', opts:['1','2','3']},
                    {label:'搬行李上樓(每件) +$100', opts:['1','2','3','4','5']},
                    {label:'中途等待(每30分) +$300', opts:['1','2','3','4']},
                    {label:'攜帶寵物 +$100', opts:['1','2','3']},
                  ].map((s,i)=>(
                    <label key={i} className="flex items-center gap-1 text-xs text-mist cursor-pointer">
                      <input type="checkbox" className="accent-gold" />
                      {s.label}
                      <select className="bg-charcoal border border-white/10 rounded px-1 py-0.5 text-xs w-12 text-ivory">
                        {s.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          <PriceCard price={price} calculating={calculating} duration={duration} onRecalculate={calcPrice} />

          {/* Customer Info */}
          <div className="border-t border-white/5 pt-5 mt-5">
            <h3 className="text-ivory font-medium mb-3">
              乘車人資料 <span className="text-fog text-xs">*必填</span>
            </h3>
            {/* 登入提示 */}
            {user ? (
              <div className="text-xs text-success mb-3 bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                已登入 <span className="text-gold">{user.fullName}</span>，姓名/手機/信箱已自動填入
                <button onClick={() => { useAuthStore.getState().logout(); }} className="ml-2 text-fog hover:text-mist underline">切換帳號</button>
              </div>
            ) : (
              <div className="text-xs text-fog mb-3 bg-charcoal rounded-lg px-3 py-2">
                <Link to="/login" className="text-gold hover:underline">登入</Link> 或 <Link to="/register" className="text-gold hover:underline">註冊</Link> 後自動記錄地址與聯絡資料
              </div>
            )}
            {/* 最近地址快速選擇 */}
            {recentAddresses.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-fog mb-1.5">最近使用的地址：</div>
                <div className="flex flex-wrap gap-1">
                  {recentAddresses.map((addr: any, i: number) => (
                    <button key={i} type="button" onClick={() => setDest(addr.label)}
                      className="text-xs bg-charcoal border border-white/10 hover:border-gold/30 text-mist hover:text-ivory px-2 py-1 rounded-lg transition-colors">
                      {addr.label?.slice(0, 20)}{(addr.label?.length > 20) ? '...' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {[
                { label: '姓名', value: name, set: setName, ph: '請填寫姓名' },
                { label: '手機', value: phone, set: setPhone, ph: '請填寫手機' },
                { label: '信箱', value: email, set: setEmail, ph: '請填寫信箱' },
              ].map((f,i)=>(
                <div key={i}>
                  <label className="block text-xs text-mist mb-1">{f.label} <span className="text-gold">*</span></label>
                  <input value={f.value} onChange={e=>f.set(e.target.value)}
                    className="input-premium w-full" placeholder={f.ph} />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <button onClick={()=>setShowContact(!showContact)}
                className="text-fog text-xs hover:text-gold transition-colors">
                {showContact ? '▲ 收起' : '▼ 其它聯絡方式'}
              </button>
              {showContact && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['LINE ID','微信','WhatsApp','備用電話','備用信箱','聯絡人2','聯絡人2電話','備註'].map((label,i)=>(
                    <input key={i} className="input-premium text-xs" placeholder={label} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button onClick={submit}
            className="btn-gold w-full mt-6 py-3.5 text-base">
            {tabLabel} · 確認預約
          </button>

          {/* Notes */}
          <div className="mt-4 text-xs text-fog space-y-1 bg-charcoal rounded-lg p-3">
            <p>取消訂單完全免費，最晚請於預約時間前 2 小時取消</p>
            <p>線上刷卡或現金於下車時付費皆可</p>
            <p>全部車輛均為合法登記並投保乘客險</p>
            <p>24 小時真人客服，歡迎隨時聯繫</p>
          </div>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="border-t border-white/5 bg-charcoal">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-gold font-display text-lg mb-3">會員中心</h4>
            <ul className="space-y-1 text-sm text-mist">
              <li><Link to="/login" className="hover:text-gold transition-colors">會員登入</Link></li>
              <li><Link to="/register" className="hover:text-gold transition-colors">會員註冊</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-gold font-display text-lg mb-3">關於我們</h4>
            <ul className="space-y-1 text-sm text-mist">
              <li><a href="#" className="hover:text-gold transition-colors">訂車須知</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">加購項目說明</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">隱私權政策</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">服務據點</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-gold font-display text-lg mb-3">聯絡我們</h4>
            <ul className="space-y-1 text-xs text-mist">
              <li>LINE: @airportfrstcar</li>
              <li>WeChat: twairportcar</li>
              <li>24H: 0906-146-632</li>
            </ul>
          </div>
          <div>
            <h4 className="text-gold font-display text-lg mb-3">社群</h4>
            <div className="flex gap-2">
              <span className="bg-gold/20 text-gold px-3 py-1 rounded text-xs">LINE</span>
              <span className="bg-gold/20 text-gold px-3 py-1 rounded text-xs">FB</span>
              <span className="bg-gold/20 text-gold px-3 py-1 rounded text-xs">WhatsApp</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-fog text-xs">
          &copy; 2026 機場快綫 Airport Express Taiwan · 全台專業機場接送
        </div>
      </footer>
    </div>
  );
}
