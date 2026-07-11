interface Props {
  price: number | null;
  calculating: boolean;
  duration: string;
  onRecalculate: () => void;
}

export default function PriceCard({ price, calculating, duration, onRecalculate }: Props) {
  return (
    <div className="bg-charcoal rounded-xl p-5 flex items-center justify-between border border-white/5">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-xs text-fog uppercase tracking-wider mb-0.5">行車時間</div>
          <div className="text-xl font-bold text-ivory">{duration}<span className="text-sm text-mist ml-1">分鐘</span></div>
        </div>
        <div className="w-px h-10 bg-white/5" />
        <div>
          <div className="text-xs text-fog uppercase tracking-wider mb-0.5">費用試算</div>
          <div className="text-2xl font-display text-gold">
            {calculating ? (
              <span className="text-mist text-lg">計算中...</span>
            ) : price !== null ? (
              <span>NT$ {price.toLocaleString()}</span>
            ) : (
              <span className="text-fog text-lg">請填寫地址</span>
            )}
          </div>
        </div>
      </div>
      <button onClick={onRecalculate}
        className="btn-outline text-sm py-2 px-5">
        重新計算
      </button>
    </div>
  );
}
