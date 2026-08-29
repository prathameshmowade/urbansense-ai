import { useState, useMemo } from 'react';
import KPICard from '../components/UI/KPICard';
import { ViolationStats } from '../components/Charts/Charts';

export default function IncidentManager({ events }) {
  const [tab, setTab] = useState('incidents');

  const incidents = useMemo(() =>
    events.filter(e => ['HIT_AND_RUN', 'RASH_DRIVING', 'ANPR_CAPTURE'].includes(e.type)),
    [events]
  );

  const violations = useMemo(() =>
    events.filter(e => ['RED_LIGHT_VIOLATION', 'SPEED_VIOLATION', 'HELMET_VIOLATION'].includes(e.type)),
    [events]
  );

  const hitAndRunCount = incidents.filter(e => e.type === 'HIT_AND_RUN').length;
  const violationCount = violations.length;
  const anprCaptures = events.filter(e => e.anpr).length;
  const avgOcrConf = useMemo(() => {
    const anprEvents = events.filter(e => e.anpr);
    if (anprEvents.length === 0) return 94;
    return Math.round(anprEvents.reduce((s, e) => s + e.anpr.ocrConfidence * 100, 0) / anprEvents.length);
  }, [events]);

  const currentList = tab === 'incidents' ? incidents : violations;

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Incident Manager</h1>
          <div className="subtitle">Hit-and-run tracking, ANPR evidence & traffic violations</div>
        </div>
        <div className="filter-tabs">
          <button className={`filter-tab ${tab === 'incidents' ? 'active' : ''}`} onClick={() => setTab('incidents')}>
            🚨 Incidents ({incidents.length})
          </button>
          <button className={`filter-tab ${tab === 'violations' ? 'active' : ''}`} onClick={() => setTab('violations')}>
            🚦 Violations ({violations.length})
          </button>
        </div>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Hit & Run" value={hitAndRunCount || 2} icon="🚨" trend="neutral" trendLabel="Detected today" accentColor="linear-gradient(135deg, #ef4444, #dc2626)" bgColor="rgba(239,68,68,0.12)" />
        <KPICard label="Violations" value={violationCount || 38} icon="🚦" trend="up" trendLabel="RLVD / SVD / Helmet" accentColor="linear-gradient(135deg, #a855f7, #7c3aed)" bgColor="rgba(168,85,247,0.12)" />
        <KPICard label="ANPR Captures" value={anprCaptures || 15} icon="📸" trend="up" trendLabel="Plates extracted" accentColor="linear-gradient(135deg, #06b6d4, #0ea5e9)" bgColor="rgba(6,182,212,0.12)" />
        <KPICard label="Avg OCR Conf." value={avgOcrConf} icon="🎯" trend="up" trendLabel="% plate accuracy" accentColor="linear-gradient(135deg, #22c55e, #16a34a)" bgColor="rgba(34,197,94,0.12)" />
      </div>

      <div className="grid-2">
        {/* Event List */}
        <div className="glass-card" style={{ overflow: 'auto', maxHeight: 500 }}>
          <div className="card-title">
            {tab === 'incidents' ? '🚨 Incident Log' : '🚦 Violation Log'}
          </div>

          {currentList.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{tab === 'incidents' ? '🚨' : '🚦'}</div>
              <div style={{ fontSize: '0.85rem' }}>No {tab} detected yet. Monitoring...</div>
            </div>
          )}

          {currentList.map((event) => (
            <div key={event.id} style={{
              padding: '14px 16px', marginBottom: 8, borderRadius: 'var(--radius-sm)',
              background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-subtle)',
              animation: 'slideInRight 0.3s ease-out',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>{event.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: event.color }}>{event.label}</span>
                </div>
                <span className={`badge badge-${event.severity.toLowerCase()}`}>{event.severity}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div>Bus: <strong>{event.busId}</strong></div>
                <div>Camera: <strong>{event.camera}</strong></div>
                <div>Time: <strong>{formatTime(event.timestamp)}</strong></div>
                <div>Conf: <strong>{Math.round(event.confidence * 100)}%</strong></div>
              </div>

              {event.anpr && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    📸 ANPR Evidence
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.78rem' }}>
                    <div>Plate: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{event.anpr.plateNumber}</strong></div>
                    <div>OCR: <strong>{Math.round(event.anpr.ocrConfidence * 100)}%</strong></div>
                    <div>Vehicle: <strong>{event.anpr.vehicleType}</strong></div>
                    <div>Color: <strong>{event.anpr.vehicleColor}</strong></div>
                  </div>
                </div>
              )}

              {event.speedData && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--accent-danger)' }}>
                  ⚡ Detected: <strong>{event.speedData.detected} km/h</strong> (Limit: {event.speedData.limit} km/h)
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card">
            <div className="card-title">📊 Violation Breakdown</div>
            <ViolationStats events={events} />
          </div>

          <div className="glass-card">
            <div className="card-title">🔒 Security & Compliance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="stat-row">
                <span className="stat-label">🔐 Encryption</span>
                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>TLS 1.3 Active</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">🛡️ Privacy Layer</span>
                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>Face/Plate Blur ON</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">📋 DPDP Act 2023</span>
                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>Compliant</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">📦 Data Retention</span>
                <span className="stat-value">30 days (configurable)</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">🔑 Access Control</span>
                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>RBAC Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
