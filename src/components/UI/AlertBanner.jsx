import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AlertBanner({ event, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 400);
    }, 8000);
    return () => clearTimeout(timer);
  }, [event, onDismiss]);

  if (!visible || !event) return null;

  return (
    <div className="alert-banner" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s' }}>
      <span className="alert-icon">🚨</span>
      <div className="alert-content">
        <div className="alert-title">
          {event.label}
          {event.anpr && ` — ${event.anpr.plateNumber}`}
        </div>
        <div className="alert-subtitle">
          Bus {event.busId} · {event.camera} camera · Confidence {Math.round(event.confidence * 100)}%
          {event.anpr && ` · ${event.anpr.vehicleColor} ${event.anpr.vehicleType}`}
        </div>
      </div>
      <button className="alert-close" onClick={() => { setVisible(false); onDismiss?.(); }}>
        <X size={16} />
      </button>
    </div>
  );
}
