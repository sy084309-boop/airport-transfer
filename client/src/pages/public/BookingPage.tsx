import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import FlightValidator from '../../components/booking/FlightValidator';

const AIRPORTS = ['臺灣桃園國際機場','臺北松山機場','臺中國際機場','高雄小港機場','臺南航空站'];
const VEHICLES = ['sedan','luxury','suv','van','luxury_van','import'];
const V_LABELS: Record<string,string> = {sedan:'舒適五人座',luxury:'豪華五人座',suv:'舒適七人座',van:'舒適九人座',luxury_van:'豪華九人座',import:'進口五人座'};
const HOURS = Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

export default function BookingPage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const [tab,setTab] = useState<'pickup'|'sendoff'|'general'>('sendoff');
  const [mode,setMode] = useState<'flight'|'time'>('time');
  const [airport,setAirport] = useState(AIRPORTS[0]);
  const [dest,setDest] = useState('');
  const [flightNo,setFlightNo] = useState('');
  const d=new Date();
  const [year,setYear]=useState(d.getFullYear()); const [month,setMonth]=useState(String(d.getMonth()+1).padStart(2,'0')); const [day,setDay]=useState(String(d.getDate()).padStart(2,'0'));
  const [hour,setHour]=useState(()=>String(new Date().getHours()).padStart(2,'0')); const [minute,setMinute]=useState(()=>{const m=new Date().getMinutes();return m<5?'00':String(Math.floor(m/5)*5).padStart(2,'0');});
  const [vehicle,setVehicle]=useState('sedan'); const [passengers,setPassengers]=useState(1); const [luggage,setLuggage]=useState(0);
  const [signboard,setSignboard]=useState(false); const [signboardTitle,setSignboardTitle]=useState(''); const [signboardContent,setSignboardContent]=useState('');
  const [signboard2,setSignboard2]=useState(false);
  const [showServices,setShowServices]=useState(false);
  const [addrCount,setAddrCount]=useState(1); const [destAddrCount,setDestAddrCount]=useState(1); const [showContact,setShowContact]=useState(false);
  const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [email,setEmail]=useState('');
  const [payment,setPayment]=useState('cash'); const [price,setPrice]=useState<number|null>(null); const [calculating,setCalculating]=useState(false);

  useEffect(() => {
    if (user) {
      if (!name && user.fullName) setName(user.fullName);
      if (!phone && user.phone) setPhone(user.phone);
      if (!email && user.email) setEmail(user.email);
    }
  }, [user]);

  const calcPrice = async () => { if(!dest) return; setCalculating(true); try{ const{data}=await api.post('/pricing/calculate',{vehicleType:vehicle,origin:'taipei',dest:'taoyuan_airport'}); setPrice(data.totalPrice+(signboard?200:0)+(signboard2?200:0)); } catch{setPrice(null)} setCalculating(false); };

  const submit = async () => {
    if(new Date(`${year}-${month}-${day}T${hour}:${minute}:00`)<new Date()) return alert('不可預約過去的時間');
    if(!dest) return alert('請填寫地址');
    if(!name) return alert('請填寫姓名');
    if(!phone) return alert('請填寫手機');
    const sched=`${year}-${month}-${day}T${hour}:${minute}:00`;
    const extras=[signboard?'舉牌':null,signboard2?'第二組舉牌':null].filter(Boolean).join(',');
    const{data}=await api.post('/bookings',{bookingType:tab,pickupAddress:tab==='pickup'?airport:dest,dropoffAddress:tab==='pickup'?dest:airport,flightNumber:flightNo||null,scheduledPickupAt:sched,passengerCount:passengers,luggageCount:luggage,vehicleType:vehicle,paymentMethod:payment,specialRequests:extras||null});
    nav(`/track/${data.referenceCode}`);
  };

  const tabs=[{key:'sendoff'as const,label:'🛫 送機'},{key:'pickup'as const,label:'🛬 接機'},{key:'general'as const,label:'🚗 一般'}];

  return (
    <div className="min-h-screen bg-obsidian">
      <nav className="border-b border-white/5 bg-charcoal/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><span className="text-2xl">&#9992;</span><span className="font-display text-lg text-gold">機場快綫</span></Link>
          <div className="flex gap-4 text-sm">
            <Link to="/" className="text-mist hover:text-gold transition-colors">首頁</Link>
            <Link to="/booking" className="text-gold font-bold">預約</Link>
            <Link to="/track" className="text-mist hover:text-gold transition-colors">查詢</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">
        <h2 className="font-display text-2xl text-ivory mb-1">預約訂車</h2>
        <p className="text-xs text-fog mb-6">首頁 &gt; 預約流程</p>

        <div className="glass-card p-6 space-y-4">
          <div className="flex bg-ash/50 rounded-xl p-1">{tabs.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} className={`flex-1 py-2.5 text-sm rounded-lg transition-all ${tab===t.key?'bg-gold text-obsidian':'text-mist hover:text-ivory'}`}>{t.label}</button>))}</div>

          {/* Pickup: Airport first */}
          {tab==='pickup'&&<div><label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">出發地（機場）</label><select value={airport} onChange={e=>setAirport(e.target.value)} className="input-premium w-full">{AIRPORTS.map(a=><option key={a}>{a}</option>)}</select></div>}

          {/* Sendoff/General: Address first */}
          {(tab==='sendoff'||tab==='general')&&<div>
            <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">出發地</label>
            <input value={dest} onChange={e=>setDest(e.target.value)} className="input-premium w-full" placeholder="地址 1" />
            {addrCount>=2&&<input className="input-premium w-full mt-1.5" placeholder="地址 2" />}
            {addrCount>=3&&<input className="input-premium w-full mt-1.5" placeholder="地址 3" />}
            {addrCount>=4&&<input className="input-premium w-full mt-1.5" placeholder="地址 4" />}
            <div className="flex gap-2 mt-1">
              {addrCount<4&&<button type="button" onClick={()=>setAddrCount(c=>c+1)} className="text-xs text-gold hover:underline">+ 新增地址</button>}
              {addrCount>1&&<button type="button" onClick={()=>setAddrCount(1)} className="text-xs text-fog hover:underline">- 收起</button>}
            </div>
          </div>}

          {/* Pickup: Destination */}
          {tab==='pickup'&&<div>
            <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">目的地</label>
            <input value={dest} onChange={e=>setDest(e.target.value)} className="input-premium w-full" placeholder="地址 1" />
            {addrCount>=2&&<input className="input-premium w-full mt-1.5" placeholder="地址 2" />}
            {addrCount>=3&&<input className="input-premium w-full mt-1.5" placeholder="地址 3" />}
            {addrCount>=4&&<input className="input-premium w-full mt-1.5" placeholder="地址 4" />}
          </div>}

          {/* Sendoff: Airport after address */}
          {tab==='sendoff'&&<div><label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">目的地（機場）</label><select value={airport} onChange={e=>setAirport(e.target.value)} className="input-premium w-full">{AIRPORTS.map(a=><option key={a}>{a}</option>)}</select></div>}

          {/* General: Destination */}
          {tab==='general'&&<div>
            <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">目的地</label>
            <input className="input-premium w-full" placeholder="目的地地址 1" />
            {destAddrCount>=2&&<input className="input-premium w-full mt-1.5" placeholder="目的地地址 2" />}
            {destAddrCount>=3&&<input className="input-premium w-full mt-1.5" placeholder="目的地地址 3" />}
            {destAddrCount>=4&&<input className="input-premium w-full mt-1.5" placeholder="目的地地址 4" />}
          </div>}

          {/* Mode */}
          {tab==='pickup'&&<div><label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">預約方式</label><div className="flex gap-1 bg-ash/50 rounded-lg p-1 w-fit"><button onClick={()=>setMode('flight')} className={`px-4 py-2 rounded-md text-sm transition-all ${mode==='flight'?'bg-gold/20 text-gold':'text-mist hover:text-ivory'}`}>&#9992; 依航班</button><button onClick={()=>setMode('time')} className={`px-4 py-2 rounded-md text-sm transition-all ${mode==='time'?'bg-gold/20 text-gold':'text-mist hover:text-ivory'}`}>&#128338; 指定時間</button></div></div>}

          <div><label className="block text-xs text-mist mb-1.5">{tab==='pickup'?(mode==='flight'?'航班日期':'乘車日期'):'乘車日期'}</label></div>

          {/* Flight — 接機依航班驗證，指定時間/送機簡單輸入 */}
          {tab==='pickup'&&mode==='flight'&&<div className="flex gap-3">
            <div className="flex-1"><FlightValidator flightNo={flightNo} onChange={setFlightNo} /></div>
            <div className="w-28"><label className="block text-xs text-mist mb-1.5">航廈</label><select className="input-premium w-full text-sm">{airport.includes('桃園')?<><option>T1</option><option>T2</option><option>T3</option></>:<><option>國內</option><option>國際</option></>}</select></div>
          </div>}
          {(tab==='sendoff'||(tab==='pickup'&&mode==='time'))&&<div className="flex gap-3">
            <div className="w-28"><label className="block text-xs text-mist mb-1.5">航班編號</label><input value={flightNo} onChange={e=>setFlightNo(e.target.value)} className="input-premium w-full" placeholder="選填" /></div>
            <div className="w-28"><label className="block text-xs text-mist mb-1.5">航廈</label><select className="input-premium w-full text-sm">{airport.includes('桃園')?<><option>T1</option><option>T2</option><option>T3</option></>:<><option>國內</option><option>國際</option></>}</select></div>
          </div>}

          <div className="grid grid-cols-3 gap-1.5">
            <div><label className="block text-xs text-mist mb-1">年</label><div className="flex items-center bg-charcoal rounded-lg border border-white/5"><button onClick={()=>setYear(y=>y-1)} className="px-2 py-2 text-fog hover:text-ivory text-xs">&larr;</button><span className="flex-1 text-center text-sm font-medium text-ivory">{year}</span><button onClick={()=>setYear(y=>y+1)} className="px-2 py-2 text-fog hover:text-ivory text-xs">&rarr;</button></div></div>
            <div><label className="block text-xs text-mist mb-1">月</label><select value={month} onChange={e=>setMonth(e.target.value)} className="input-premium w-full text-sm text-center">{Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(m=><option key={m} value={m}>{m}月</option>)}</select></div>
            <div><label className="block text-xs text-mist mb-1">日</label><select value={day} onChange={e=>setDay(e.target.value)} className="input-premium w-full text-sm text-center">{Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=><option key={d} value={d}>{d}日</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div><label className="block text-xs text-mist mb-1">時</label><select value={hour} onChange={e=>setHour(e.target.value)} className="input-premium w-full text-sm text-center">{HOURS.map(h=><option key={h} value={h}>{h}時</option>)}</select></div>
            <div><label className="block text-xs text-mist mb-1">分</label><select value={minute} onChange={e=>setMinute(e.target.value)} className="input-premium w-full text-sm text-center">{MINUTES.map(m=><option key={m} value={m}>{m}分</option>)}</select></div>
          </div>

          {/* Vehicle */}
          <div><label className="block text-xs text-mist mb-2 uppercase tracking-wider">車型</label><div className="grid grid-cols-3 gap-1.5">{VEHICLES.map(v=>(<button key={v} onClick={()=>setVehicle(v)} className={`py-3 rounded-lg text-xs transition-all border ${vehicle===v?'border-gold bg-gold/10 text-gold':'border-white/5 text-mist hover:border-white/15 hover:text-ivory'}`}>{V_LABELS[v]}</button>))}</div></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-mist mb-1.5">人數</label><select value={passengers} onChange={e=>setPassengers(+e.target.value)} className="input-premium w-full text-sm">{[1,2,3,4,5,6,7,8,9].map(n=><option key={n}>{n}人</option>)}</select></div>
            <div><label className="block text-xs text-mist mb-1.5">行李</label><select value={luggage} onChange={e=>setLuggage(+e.target.value)} className="input-premium w-full text-sm"><option value={0}>無行李</option>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}件</option>)}</select></div>
          </div>

          {/* Add-ons */}
          <div><label className="block text-xs text-mist mb-2 uppercase tracking-wider">加值服務</label>
            <label className="flex items-center gap-2 text-sm text-ivory/80 mb-1"><input type="checkbox" checked={signboard} onChange={e=>setSignboard(e.target.checked)} className="accent-gold" />舉牌服務 +$200</label>
            {signboard&&<div className="ml-6 space-y-1 mb-1"><input value={signboardTitle} onChange={e=>setSignboardTitle(e.target.value)} className="input-premium w-full text-xs" placeholder="舉牌文字主題"/><input value={signboardContent} onChange={e=>setSignboardContent(e.target.value)} className="input-premium w-full text-xs" placeholder="舉牌內容"/></div>}
            <label className="flex items-center gap-2 text-sm text-ivory/80 mb-1"><input type="checkbox" checked={signboard2} onChange={e=>setSignboard2(e.target.checked)} className="accent-gold" />第二組舉牌 +$200</label>
            <button onClick={()=>setShowServices(!showServices)} className="text-xs text-gold hover:underline mt-1">{showServices?'▲ 收起':'▼ 更多加值服務'}</button>
            {showServices&&<div className="grid grid-cols-2 gap-1 ml-4 mt-1">{[{l:'嬰兒座椅 0-1歲',p:200},{l:'兒童座椅 1-4歲',p:200},{l:'增高座墊 4-8歲',p:150},{l:'搬行李上樓(件)',p:100},{l:'中途等待(30分)',p:300},{l:'攜帶寵物',p:100}].map(s=><label key={s.l} className="flex items-center gap-1 text-xs text-mist"><input type="checkbox" className="accent-gold"/>{s.l} +${s.p}</label>)}</div>}
          </div>

          {/* Payment */}
          <div><label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">付款方式</label><select value={payment} onChange={e=>setPayment(e.target.value)} className="input-premium w-full text-sm"><option value="cash">現金（下車付費）</option><option value="card">線上刷卡</option></select></div>

          {/* Price */}
          <div className="bg-charcoal rounded-xl p-4 flex justify-between items-center border border-white/5"><span className="text-sm text-mist">{calculating?'計算中...':price!==null?`NT$ ${price?.toLocaleString()}`:'尚未試算'}</span><button onClick={calcPrice} className="btn-outline text-sm py-1.5 px-4">試算車資</button></div>

          {/* Customer info */}
          <div className="border-t border-white/5 pt-4">
            <h4 className="text-ivory font-medium text-sm mb-2">乘車人資料</h4>
            <input value={name} onChange={e=>setName(e.target.value)} className="input-premium w-full mb-2" placeholder="姓名 *"/>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="input-premium w-full mb-2" placeholder="手機 *"/>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="input-premium w-full" placeholder="信箱 *"/>
            <button onClick={()=>setShowContact(!showContact)} className="text-xs text-gold hover:underline mt-2">{showContact?'▲ 收起':'▼ 其它聯絡方式'}</button>
            {showContact&&<div className="grid grid-cols-2 gap-2 mt-2">{['LINE ID','微信','WhatsApp','備用電話','備用信箱','聯絡人2','聯絡人2電話','備註'].map((x,i)=><input key={i} className="input-premium text-xs" placeholder={x}/>)}</div>}
          </div>

          <button onClick={submit} className="btn-gold w-full py-3">確認預約</button>
        </div>
      </div>
    </div>
  );
}
