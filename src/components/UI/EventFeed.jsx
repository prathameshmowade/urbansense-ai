import { useEffect, useRef, useState } from 'react';
import { EVENT_TYPES } from '../../data/eventTypes';

export default function EventFeed({ events }) {
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      case 'LOW': return 'badge-low';
      default: return 'badge-info';
    }
  };

  return (
    <div className="event-feed glass-card" style={{ padding: 0 }}>
      <div className="event-feed-header">
        <h3>
          📡 Live Event Feed
        </h3>
        <div className="live-indicator">
          <span className="live-dot"></span>
          LIVE
        </div>
      </div>
      <div className="event-feed-list" ref={listRef}>
        {events.slice(0, 50).map((event) => (
          <div
            key={event.id}
            className="event-item"
          >
            <div
              className="event-icon"
              style={{ background: `${event.color}20`, border: `1px solid ${event.color}40` }}
            >
              {event.icon}
            </div>
            <div className="event-content">
              <div className="event-title">
                {event.label}
                {event.confirmedByIMU && (
                  <span style={{ marginLeft: 6, fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 700 }}>⚡ IMU {event.fusion?.zAxisPeak}g</span>
                )}
                {event.crossVerified && (
                  <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--accent-success)' }}>✓ Cross-verified</span>
                )}
              </div>
              <div className="event-meta">
                <span>{event.busId}</span>
                <span>•</span>
                <span>{formatTime(event.timestamp)}</span>
                {event.geofenceZone && (
                  <>
                    <span>•</span>
                    <span style={{ color: event.geofenceZone.color, fontWeight: 600, fontSize: '0.68rem' }}>{event.geofenceZone.icon} {event.geofenceZone.name.split(' ')[0]}</span>
                  </>
                )}
                <span>•</span>
                <span className={`severity-badge ${getSeverityClass(event.severity)}`}>
                  {event.severity}
                </span>
              </div>
            </div>
            <div
              className="event-confidence"
              style={{
                background: `${event.color}15`,
                color: event.color,
                border: `1px solid ${event.color}30`,
              }}
            >
              {Math.round(event.confidence * 100)}%
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Waiting for events...
          </div>
        )}
      </div>
    </div>
  );
}
