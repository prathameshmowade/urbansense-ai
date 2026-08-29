import { useMemo } from 'react';
import KPICard from '../components/UI/KPICard';
import LiveMap from '../components/Map/LiveMap';
import { busRoutes } from '../data/nagpurRoutes';

export default function CoverageAnalysis({ buses, stats }) {
  const routeStats = useMemo(() => {
    return busRoutes.map(route => {
      const routeBuses = buses.filter(b => b.routeId === route.id);
      const activeBuses = routeBuses.filter(b => b.status === 'active');
      const lastScanned = activeBuses.length > 0 ? 'Just now' : '> 30 min ago';
      const coverage = activeBuses.length > 0 ? 70 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 40);
      return {
        ...route,
        busCount: routeBuses.length,
        activeBuses: activeBuses.length,
        lastScanned,
        coverage,
      };
    });
  }, [buses]);

  const blindSpots = useMemo(() => {
    return routeStats.filter(r => r.coverage < 50).length;
  }, [routeStats]);

  const avgCoverage = Math.round(routeStats.reduce((s, r) => s + r.coverage, 0) / routeStats.length);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Coverage Analysis</h1>
          <div className="subtitle">Fleet coverage intelligence & sensing blind-spot detection</div>
        </div>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Routes Covered" value={routeStats.filter(r => r.activeBuses > 0).length} icon="🛣️" trend="up" trendLabel={`of ${routeStats.length} total routes`} accentColor="linear-gradient(135deg, #22c55e, #16a34a)" bgColor="rgba(34,197,94,0.12)" />
        <KPICard label="Avg Coverage" value={avgCoverage} icon="📡" trend={avgCoverage > 70 ? 'up' : 'down'} trendLabel="% of route network" accentColor="linear-gradient(135deg, #00e5ff, #06b6d4)" bgColor="rgba(0,229,255,0.12)" />
        <KPICard label="Blind Spots" value={blindSpots} icon="👁️" trend={blindSpots > 2 ? 'up' : 'down'} trendLabel="Routes with low coverage" accentColor="linear-gradient(135deg, #ef4444, #dc2626)" bgColor="rgba(239,68,68,0.12)" />
        <KPICard label="Fleet Efficiency" value={stats.coveragePercent} icon="📊" trend="up" trendLabel="% optimal deployment" accentColor="linear-gradient(135deg, #7c3aed, #a855f7)" bgColor="rgba(124,58,237,0.12)" />
      </div>

      <div className="grid-map-panel">
        <LiveMap
          buses={buses}
          events={[]}
          showRoutes={true}
          showHeatMap={false}
          showEvents={false}
          showRoadHealth={false}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
            <div className="card-title">🛣️ Route Coverage Status</div>

            {routeStats.map((route) => (
              <div key={route.id} style={{
                padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: route.color, display: 'inline-block' }}></span>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{route.id}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{route.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: route.coverage > 70 ? '#22c55e' : route.coverage > 40 ? '#f59e0b' : '#ef4444',
                  }}>
                    {route.coverage}%
                  </span>
                </div>

                <div className="progress-bar" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{
                    width: `${route.coverage}%`,
                    background: route.coverage > 70 ? '#22c55e' : route.coverage > 40 ? '#f59e0b' : '#ef4444',
                  }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>🚌 {route.activeBuses}/{route.busCount} buses active</span>
                  <span>🕐 {route.lastScanned}</span>
                </div>
              </div>
            ))}
          </div>

          {blindSpots > 0 && (
            <div className="glass-card" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <div className="card-title" style={{ color: '#ef4444' }}>⚠️ Blind Spot Recommendations</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p style={{ marginBottom: 8 }}>
                  <strong>{blindSpots}</strong> route(s) have less than 50% coverage. Consider:
                </p>
                <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Reassigning idle buses to under-covered routes</li>
                  <li>Increasing bus frequency during peak scan hours</li>
                  <li>Deploying supplementary fixed sensors at critical blind spots</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
