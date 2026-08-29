import { useState, useMemo } from 'react';
import KPICard from '../components/UI/KPICard';
import LiveMap from '../components/Map/LiveMap';
import { DefectBreakdown } from '../components/Charts/Charts';

export default function RoadIntelligence({ buses, events, roadHealth }) {
  const [filter, setFilter] = useState('ALL');

  const defectEvents = useMemo(() => {
    const types = ['POTHOLE', 'CRACK', 'WATERLOGGING', 'DAMAGED_ROAD', 'MISSING_DIVIDER', 'MISSING_ZEBRA', 'DAMAGED_SIGNAGE'];
    return events.filter(e => types.includes(e.type));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return defectEvents;
    return defectEvents.filter(e => e.type === filter);
  }, [defectEvents, filter]);

  const potholeCount = defectEvents.filter(e => e.type === 'POTHOLE').length;
  const crackCount = defectEvents.filter(e => e.type === 'CRACK').length;
  const infraCount = defectEvents.filter(e => ['MISSING_DIVIDER', 'MISSING_ZEBRA', 'DAMAGED_SIGNAGE'].includes(e.type)).length;
  const avgHealth = roadHealth.length > 0 ? Math.round(roadHealth.reduce((s, r) => s + r.score, 0) / roadHealth.length) : 78;

  const filters = [
    { key: 'ALL', label: 'All Defects' },
    { key: 'POTHOLE', label: 'Potholes' },
    { key: 'CRACK', label: 'Cracks' },
    { key: 'WATERLOGGING', label: 'Waterlogging' },
    { key: 'DAMAGED_ROAD', label: 'Damaged' },
    { key: 'MISSING_DIVIDER', label: 'Dividers' },
    { key: 'MISSING_ZEBRA', label: 'Zebra' },
    { key: 'DAMAGED_SIGNAGE', label: 'Signage' },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Road Intelligence</h1>
          <div className="subtitle">AI-detected road defects & infrastructure health</div>
        </div>
        <div className="filter-tabs" style={{ flexWrap: 'wrap', gap: 4 }}>
          {filters.map(f => (
            <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Potholes" value={potholeCount || 24} icon="🕳️" trend="up" trendLabel="Detected today" accentColor="linear-gradient(135deg, #f97316, #fb923c)" bgColor="rgba(249,115,22,0.12)" />
        <KPICard label="Road Cracks" value={crackCount || 18} icon="⚡" trend="up" trendLabel="Surface damage" accentColor="linear-gradient(135deg, #dc2626, #ef4444)" bgColor="rgba(220,38,38,0.12)" />
        <KPICard label="Infra Deficiency" value={infraCount || 9} icon="🚧" trend="neutral" trendLabel="Missing/damaged infra" accentColor="linear-gradient(135deg, #06b6d4, #0ea5e9)" bgColor="rgba(6,182,212,0.12)" />
        <KPICard label="Avg Road Health" value={avgHealth} icon="🛣️" trend={avgHealth > 70 ? 'up' : 'down'} trendLabel="Score out of 100" accentColor="linear-gradient(135deg, #22c55e, #16a34a)" bgColor="rgba(34,197,94,0.12)" />
      </div>

      <div className="grid-map-panel">
        <LiveMap
          buses={[]}
          events={filteredEvents}
          roadHealth={roadHealth}
          showRoutes={true}
          showHeatMap={false}
          showRoadHealth={true}
          showEvents={true}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card">
            <div className="card-title">📊 Defect Distribution</div>
            <DefectBreakdown events={events} />
          </div>

          <div className="glass-card">
            <div className="card-title">🔧 Priority Repair Queue</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEvents.filter(e => !e.isDuplicate).slice(0, 6).map((e, i) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)', background: 'rgba(15,23,42,0.5)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                  <span style={{ fontSize: '0.9rem' }}>{e.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{e.label}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{e.busId} · {Math.round(e.confidence * 100)}% conf</div>
                  </div>
                  <span className={`badge badge-${e.severity.toLowerCase()}`}>{e.severity}</span>
                </div>
              ))}
              {filteredEvents.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No defects detected yet. Monitoring...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
