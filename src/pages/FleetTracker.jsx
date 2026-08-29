import KPICard from '../components/UI/KPICard';
import LiveMap from '../components/Map/LiveMap';

export default function FleetTracker({ buses, stats }) {
  const activeBuses = buses.filter(b => b.status === 'active');
  const avgSpeed = Math.round(buses.reduce((sum, b) => sum + b.speed, 0) / buses.length);
  const avgGpu = Math.round(buses.reduce((sum, b) => sum + b.edgeDevice.gpuUtil, 0) / buses.length);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Fleet Tracker</h1>
          <div className="subtitle">Real-time bus fleet monitoring & edge device status</div>
        </div>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Total Fleet" value={25} icon="🚌" trend="neutral" trendLabel="PM-eBus Sewa Nagpur" bgColor="#eff6ff" />
        <KPICard label="Active Buses" value={activeBuses.length} icon="✅" trend="up" trendLabel="Currently operational" bgColor="#ecfdf5" />
        <KPICard label="Avg Speed" value={avgSpeed} icon="💨" trend="neutral" trendLabel="km/h across fleet" bgColor="#f0f9ff" />
        <KPICard label="Avg GPU Load" value={avgGpu} icon="🖥️" trend="neutral" trendLabel="% edge utilization" bgColor="#fffbeb" />
      </div>

      <div className="grid-map-panel">
        <LiveMap buses={buses} events={[]} showRoutes={true} showHeatMap={false} showEvents={false} />

        <div className="glass-card" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <div className="card-title">🚌 Fleet Status</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Bus ID</th>
                <th>Route</th>
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
                    {bus.routeId}
                  </td>
                  <td>{Math.round(bus.speed)} km/h</td>
                  <td>
                    <span className={`badge ${bus.status === 'active' ? 'badge-active' : 'badge-idle'}`}>
                      {bus.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="progress-bar" style={{ width: 50 }}>
                        <div className="progress-fill" style={{
                          width: `${bus.edgeDevice.gpuUtil}%`,
                          background: bus.edgeDevice.gpuUtil > 80 ? '#ef4444' : bus.edgeDevice.gpuUtil > 60 ? '#f59e0b' : '#22c55e',
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{bus.edgeDevice.gpuUtil}%</span>
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
