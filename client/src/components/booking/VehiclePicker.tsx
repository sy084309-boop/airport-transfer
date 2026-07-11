const VEHICLES = [
  { value: 'sedan', label: '舒適五人座', icon: '🚗' },
  { value: 'luxury', label: '豪華五人座', icon: '✨' },
  { value: 'suv', label: '舒適七人座', icon: '🚙' },
  { value: 'van', label: '舒適九人座', icon: '🚐' },
  { value: 'luxury_van', label: '豪華九人座', icon: '💎' },
  { value: 'import', label: '進口五人座', icon: '🏆' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  passengers: number;
  onPassengersChange: (n: number) => void;
  luggage: number;
  onLuggageChange: (n: number) => void;
}

export default function VehiclePicker({ value, onChange, passengers, onPassengersChange, luggage, onLuggageChange }: Props) {
  return (
    <>
      <div className="mb-4">
        <label className="block text-xs text-mist mb-2 uppercase tracking-wider">車輛選擇</label>
        <div className="grid grid-cols-3 gap-1.5">
          {VEHICLES.map(v => (
            <button key={v.value} onClick={() => onChange(v.value)}
              className={`py-3 px-2 rounded-lg text-xs text-center transition-all border ${
                value === v.value
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-white/5 text-mist hover:border-white/15 hover:text-ivory'
              }`}>
              <div className="text-lg mb-0.5">{v.icon}</div>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-mist mb-1.5">人數</label>
          <select value={passengers} onChange={e => onPassengersChange(+e.target.value)}
            className="input-premium w-full text-sm">
            {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n} 人</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-mist mb-1.5">行李數</label>
          <select value={luggage} onChange={e => onLuggageChange(+e.target.value)}
            className="input-premium w-full text-sm">
            <option value={0}>無行李</option>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} 件</option>)}
          </select>
        </div>
      </div>
    </>
  );
}
