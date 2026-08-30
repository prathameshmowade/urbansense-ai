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
        <KPICard label="Routes Covered" value={routeStats.filter(r => r.activeBuses > 0).length} icon="🛣️" trend="up" trendLabel={`of ${routeStats.length} total routes`} bgColor="#ecfdf5" />
        <KPICard label="Avg Coverage" value={avgCoverage} icon="📡" trend={avgCoverage > 70 ? 'up' : 'down'} trendLabel="% of route network" bgColor="#eff6ff" />
        <KPICard label="Blind Spots" value={blindSpots} icon="👁️" trend={blindSpots > 2 ? 'up' : 'down'} trendLabel="Routes with low coverage" bgColor="#fef2f2" />
        <KPICard label="Fleet Efficiency" value={stats.coveragePercent} icon="📊" trend="up" trendLabel="% optimal deployment" bgColor="#f5f3ff" />
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
          <div className="glass-card" style={{ overflow: 'auto', maxHeight: 480 }}>
            <div className="card-title">🛣️ Route Coverage Status</div>

            {routeStats.map((route) => (
              <div key={route.id} style={{
                padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: route.color, display: 'inline-block' }}></span>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{route.id}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{route.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: route.coverage > 70 ? 'var(--accent-success)' : route.coverage > 40 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                  }}>
                    {route.coverage}%
                  </span>
                </div>

                <div className="progress-bar" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{
                    width: `${route.coverage}%`,
                    background: route.coverage > 70 ? 'var(--accent-success)' : route.coverage > 40 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                  }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>🚌 {route.activeBuses}/{route.busCount} active</span>
                  <span>🕐 {route.lastScanned}</span>
                </div>
              </div>
            ))}
          </div>

          {blindSpots > 0 && (
            <div className="card" style={{ borderColor: 'var(--accent-danger-border)', background: 'var(--accent-danger-subtle)' }}>
              <div className="card-title" style={{ color: 'var(--accent-danger)' }}>⚠️ Blind Spot Recommendations</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <p style={{ marginBottom: 6 }}>
                  <strong>{blindSpots}</strong> route(s) have less than 50% scan coverage:
                </p>
                <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <li>Reassign idle buses to under-covered routes</li>
                  <li>Increase bus frequency during peak scan hours</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
