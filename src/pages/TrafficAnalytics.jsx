import { useMemo } from 'react';
import KPICard from '../components/UI/KPICard';
import LiveMap from '../components/Map/LiveMap';
import { VehicleDensityChart, CongestionTimeline } from '../components/Charts/Charts';

export default function TrafficAnalytics({ buses, events, congestionData }) {
  const congestionEvents = useMemo(() =>
    events.filter(e => e.type === 'CONGESTION' || e.type === 'VEHICLE_COUNT'),
    [events]
  );

  const totalVehicles = useMemo(() => {
    const countEvents = events.filter(e => e.type === 'VEHICLE_COUNT' && e.totalVehicles);
    if (countEvents.length === 0) return 1247;
    return countEvents.reduce((sum, e) => sum + e.totalVehicles, 0);
  }, [events]);

  const avgCongestion = useMemo(() => {
    const ce = events.filter(e => e.congestion);
    if (ce.length === 0) return 42;
    return Math.round(ce.reduce((s, e) => s + e.congestion.density, 0) / ce.length);
  }, [events]);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Traffic Analytics</h1>
          <div className="subtitle">Congestion heat maps, vehicle density & route delay analysis</div>
        </div>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Vehicles Counted" value={totalVehicles} icon="🚗" trend="up" trendLabel="Total detected today" bgColor="#eff6ff" />
        <KPICard label="Avg Congestion" value={avgCongestion} icon="🚦" trend={avgCongestion > 50 ? 'up' : 'down'} trendLabel="% density level" bgColor="#fef2f2" />
        <KPICard label="Bottlenecks" value={congestionData.filter(d => d[2] > 0.7).length || 3} icon="⚠️" trend="neutral" trendLabel="Active congestion zones" bgColor="#fffbeb" />
        <KPICard label="Avg Fleet Speed" value={Math.round(buses.reduce((s, b) => s + b.speed, 0) / Math.max(buses.length, 1))} icon="💨" trend="neutral" trendLabel="km/h across corridors" bgColor="#ecfdf5" />
      </div>

      <div className="grid-map-panel" style={{ marginBottom: 20 }}>
        <LiveMap
          buses={buses}
          events={[]}
          congestionData={congestionData}
          showRoutes={true}
          showHeatMap={true}
          showEvents={false}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card">
            <div className="card-title">📊 Vehicle Distribution</div>
            <VehicleDensityChart events={events} />
          </div>

          <div className="glass-card">
            <div className="card-title">📈 Congestion Timeline</div>
            <CongestionTimeline events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
