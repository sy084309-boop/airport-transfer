import { useState, useRef } from 'react';
import api from '../../services/api';

interface Props {
  flightNo: string;
  onChange: (value: string) => void;
  onValid?: (info: any) => void;
}

export default function FlightValidator({ flightNo, onChange, onValid }: Props) {
  const [valid, setValid] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [info, setInfo] = useState<any>(null);
  const [midnightWarn, setMidnightWarn] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (value: string) => {
    onChange(value);
    setValid('idle'); setInfo(null); setMidnightWarn(null); setSource(null);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 4) return;
    setValid('checking');
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/flights/validate-enhanced', { params: { q: value.trim() } });
        if (data.valid) {
          setValid('valid');
          setInfo(data.flight);
          setSource(data.source);
          if (data.midnightWarning) setMidnightWarn(data.midnightWarning);
          onValid?.(data.flight);
        } else {
          setValid('invalid');
          setInfo(data.flight);
          setSource(data.source);
          if (data.flight?.warning) setMidnightWarn(data.flight.warning);
        }
      } catch {
        setValid('invalid');
      }
    }, 500);
  };

  return (
    <div>
      <label className="block text-xs text-mist mb-1.5 uppercase tracking-wider">航班編號</label>
      <div className="relative">
        <input value={flightNo} onChange={e => handleChange(e.target.value)}
          className={`input-premium w-full ${valid === 'valid' ? 'border-success bg-success/5' : valid === 'invalid' ? 'border-danger bg-danger/5' : ''}`}
          placeholder="例：BR123" />
        <span className="absolute right-3 top-3 text-xs">
          {valid === 'checking' && <span className="text-fog">查詢中...</span>}
          {valid === 'valid' && <span className="text-success font-bold">&#10003;</span>}
          {valid === 'invalid' && <span className="text-alert font-bold">&#9888;</span>}
        </span>
      </div>

      {/* 資料來源標記 */}
      {source && (
        <div className="mt-1 text-xs text-fog">
          {source === 'tdx' && '資料來源：交通部 TDX 運輸資料平台'}
          {source === 'airline_website' && `資料來源：${info?.airlineName || '航空公司'} 官網（僅供參考）`}
          {source === 'manual' && '來源：手動查詢（請旅客自行確認）'}
        </div>
      )}

      {/* 跨夜警告 */}
      {midnightWarn && (
        <div className="mt-2 text-sm bg-alert/10 border border-alert/30 rounded-lg p-3 text-alert">
          <div className="font-bold text-ivory mb-1">&#127769; 跨夜航班提醒</div>
          <div className="text-mist">{midnightWarn}</div>
          <div className="mt-2 text-xs text-ivory">請雙重確認預約日期無誤後再送出預約。</div>
        </div>
      )}

      {/* 航班資訊 */}
      {valid === 'valid' && info && (
        <div className="mt-2 text-xs bg-success/5 border border-success/20 rounded-lg p-3 animate-fade-up">
          <div className="font-medium text-ivory text-sm">{info.airlineName}</div>
          <div className="text-mist mt-1">
            &#9992; {info.departureAirport} &#8594; {info.arrivalAirport}
          </div>
          <div className="text-fog mt-0.5">
            {info.departureTime?.replace('T', ' ')}
            {info.departureTimezone && ` (UTC${info.departureTimezone > 0 ? '+' : ''}${info.departureTimezone})`}
          </div>
          {info.timezoneDiff && info.timezoneDiff !== 0 && (
            <div className="text-alert mt-0.5">時區差：{info.timezoneDiff > 0 ? '+' : ''}{info.timezoneDiff}h</div>
          )}
          <div className="mt-1 text-success text-xs">日期時間已自動填入</div>
          {info.flightStatusUrl && (
            <a href={info.flightStatusUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-gold hover:underline">
              &#128269; 前往 {info.airlineName} 官網確認航班狀態
            </a>
          )}
        </div>
      )}

      {/* 找不到航班 */}
      {valid === 'invalid' && (
        <div className="mt-2 text-xs bg-danger/5 border border-danger/20 rounded-lg p-3">
          <div className="text-alert font-medium mb-1">
            {info?.warning || '找不到此航班，已嘗試查詢航空公司官網'}
          </div>
          {info?.airlineName && info.airlineName !== '未知航空' && (
            <div className="text-fog mt-1">
              建議前往
              {info?.flightStatusUrl || info?.sourceUrl ? (
                <a href={info.flightStatusUrl || info.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="text-gold hover:underline mx-1">
                  {info.airlineName} 航班查詢
                </a>
              ) : (
                <span className="mx-1">{info.airlineName} 官網</span>
              )}
              確認航班時間後手動填寫日期。
            </div>
          )}
          <div className="mt-1 text-mist">仍可繼續手動預約，請自行確認航班日期與接送時間。</div>
        </div>
      )}
    </div>
  );
}
