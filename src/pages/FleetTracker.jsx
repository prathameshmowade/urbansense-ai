import KPICard from '../components/UI/KPICard';
import LiveMap from '../components/Map/LiveMap';
import { Radio, ShieldAlert } from 'lucide-react';

export default function FleetTracker({ buses = [], stats = {} }) {
  const activeBuses = buses.filter(b => b.status === 'active');
  const avgSpeed = buses.length > 0 ? Math.round(buses.reduce((sum, b) => sum + b.speed, 0) / buses.length) : 0;
  const avgGpu = buses.length > 0 ? Math.round(buses.reduce((sum, b) => sum + b.edgeDevice.gpuUtil, 0) / buses.length) : 0;
  const busesInGeofences = buses.filter(b => b.activeZone).length;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Fleet Tracker & GPS Telemetry</h1>
          <div className="subtitle">Real-time PM-eBus tracking, edge telemetry & dynamic geofence AI focus — Nagpur</div>
        </div>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Total Fleet" value={25} icon="🚌" trend="neutral" trendLabel="PM-eBus Sewa Nagpur" bgColor="#eff6ff" />
        <KPICard label="Active Buses" value={activeBuses.length} icon="✅" trend="up" trendLabel="Currently operational" bgColor="#ecfdf5" />
        <KPICard label="Geofence Focused" value={busesInGeofences} icon="🎯" trend="up" trendLabel="Adaptive YOLO priority" bgColor="#fdf4ff" />
        <KPICard label="Avg GPU Load" value={avgGpu} icon="🖥️" trend="neutral" trendLabel="% edge utilization" bgColor="#fffbeb" />
      </div>

      <div className="grid-map-panel">
        <LiveMap buses={buses} events={[]} showRoutes={true} showHeatMap={false} showEvents={false} />

        <div className="glass-card" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>🚌 Live Fleet & Smart Geofencing</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>25 Buses Telemetry</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Bus ID</th>
                <th>Route</th>
                <th>AI Focus Zone</th>
                <th>Speed</th>
                <th>Status</th>
                <th>GPU</th>
                <th>FPS</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(bus => (
                <tr key={bus.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bus.id}</td>
                  <td>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: bus.routeColor, marginRight: 6 }}></span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{bus.routeId}</span>
                  </td>
                  <td>
                    {bus.activeZone ? (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        background: `${bus.activeZone.color}18`, color: bus.activeZone.color,
                        border: `1px solid ${bus.activeZone.color}40`, display: 'inline-flex', alignItems: 'center', gap: 4
                      }}>
                        <span>{bus.activeZone.icon}</span>
                        <span>{bus.activeZone.name.split(' ')[0]}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Standard (All)</span>
                    )}
                  </td>
                  <td>{Math.round(bus.speed)} km/h</td>
                  <td>
                    <span className={`badge ${bus.status === 'active' ? 'badge-active' : 'badge-idle'}`}>
                      {bus.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="progress-bar" style={{ width: 45 }}>
                        <div className="progress-fill" style={{
                          width: `${bus.edgeDevice.gpuUtil}%`,
                          background: bus.edgeDevice.gpuUtil > 80 ? '#ef4444' : bus.edgeDevice.gpuUtil > 60 ? '#f59e0b' : '#22c55e',
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>{bus.edgeDevice.gpuUtil}%</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{bus.edgeDevice.fps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
