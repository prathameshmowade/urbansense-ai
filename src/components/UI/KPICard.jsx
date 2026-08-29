import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ label, value, icon, trend, trendLabel, accentColor, bgColor }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  const isIntegerTarget = typeof value === 'number' && Number.isInteger(value);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseFloat(value) || 0;
    const start = prevValueRef.current;
    const duration = 500;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      
      if (progress >= 1) {
        setDisplayValue(target);
      } else {
        setDisplayValue(isIntegerTarget ? Math.round(current) : Math.round(current * 10) / 10);
      }

      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevValueRef.current = target;
  }, [value, isIntegerTarget]);

  const formatValue = (val) => {
    if (typeof value === 'string' && value.includes('%')) {
      return `${Math.round(val)}%`;
    }
    if (val >= 10000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return isIntegerTarget ? Math.round(val) : (Number.isInteger(val) ? val : val.toFixed(1));
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="kpi-card" style={{ '--kpi-accent': accentColor || 'var(--gradient-primary)', '--kpi-bg': bgColor || 'var(--accent-primary-dim)' }}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon" style={{ background: bgColor || 'var(--accent-primary-dim)' }}>
          {icon}
        </div>
      </div>
      <div className="kpi-value">{formatValue(displayValue)}</div>
      {trendLabel && (
        <div className={`kpi-trend ${trend || 'neutral'}`}>
          <TrendIcon size={13} />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
