import { useState, useRef, useEffect } from 'react';
import { geocodeAddress, type GeoResult } from '../../services/geocoding';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (coord: { lat: number; lng: number } | null) => void;
}

export default function AddressInput({ value, onChange, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await geocodeAddress(val);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
      setSearching(false);
    }, 400);
  };

  const select = (item: GeoResult) => {
    onChange(item.label);
    onSelect({ lat: item.lat, lng: item.lng });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        className="input-premium w-full"
        placeholder="輸入 3 字後自動搜尋地址"
      />
      {searching && (
        <span className="absolute right-3 top-3 text-xs text-fog">搜尋中...</span>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-charcoal border border-white/10 rounded-lg shadow-2xl mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((item, i) => (
            <div key={i} onClick={() => select(item)}
              className="px-4 py-3 text-sm hover:bg-gold/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors">
              <div className="text-ivory">{item.label}</div>
              {item.district && <div className="text-xs text-fog mt-0.5">{item.city} {item.district}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
