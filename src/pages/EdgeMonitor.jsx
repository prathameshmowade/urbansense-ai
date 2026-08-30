import { useMemo } from 'react';
import KPICard from '../components/UI/KPICard';

export default function EdgeMonitor({ buses, onOpenLiveCamera }) {
  const avgLatency = useMemo(() =>
    Math.round(buses.reduce((s, b) => s + b.edgeDevice.inferenceLatency, 0) / Math.max(buses.length, 1)),
    [buses]
  );
  const avgFps = useMemo(() =>
    Math.round(buses.reduce((s, b) => s + b.edgeDevice.fps, 0) / Math.max(buses.length, 1) * 10) / 10,
    [buses]
  );
  const avgTemp = useMemo(() =>
    Math.round(buses.reduce((s, b) => s + b.edgeDevice.temp, 0) / Math.max(buses.length, 1)),
    [buses]
  );
  const avgGpu = useMemo(() =>
    Math.round(buses.reduce((s, b) => s + b.edgeDevice.gpuUtil, 0) / Math.max(buses.length, 1)),
    [buses]
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Edge AI Monitor</h1>
          <div className="subtitle">Onboard bus edge compute health, inference latency & sensor status</div>
        </div>
        <button
          onClick={onOpenLiveCamera}
          className="btn btn-primary"
        >
          📹 Open Live Camera & Vision Stream
        </button>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Avg Inference" value={avgLatency} icon="⚡" trend={avgLatency < 150 ? 'down' : 'up'} trendLabel="ms / frame (target ≤200ms)" bgColor="#eff6ff" />
        <KPICard label="Avg Edge FPS" value={avgFps} icon="🎬" trend="neutral" trendLabel="Frames processed / sec" bgColor="#f5f3ff" />
        <KPICard label="Avg GPU Temp" value={avgTemp} icon="🌡️" trend={avgTemp > 65 ? 'up' : 'neutral'} trendLabel="°C (safe < 80°C)" bgColor="#fffbeb" />
        <KPICard label="Avg GPU Load" value={avgGpu} icon="🖥️" trend="neutral" trendLabel="% utilization" bgColor="#ecfdf5" />
      </div>

      {/* Edge Device Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
        {buses.map((bus) => (
          <div key={bus.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: bus.status === 'active' ? '#059669' : '#94a3b8',
                }}></span>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>🚌 {bus.id}</span>
              </div>
              <span className={`badge ${bus.status === 'active' ? 'badge-active' : 'badge-idle'}`}>{bus.status}</span>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
              {bus.edgeDevice.model} · Route {bus.routeId}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {/* Inference Latency */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Inference Latency</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bus.edgeDevice.inferenceLatency > 150 ? '#f59e0b' : '#22c55e' }}>
                    {bus.edgeDevice.inferenceLatency}ms
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${Math.min(100, bus.edgeDevice.inferenceLatency / 2)}%`,
                    background: bus.edgeDevice.inferenceLatency > 150 ? '#f59e0b' : '#22c55e',
                  }}></div>
                </div>
              </div>

              {/* GPU Utilization */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GPU Utilization</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bus.edgeDevice.gpuUtil > 80 ? '#ef4444' : '#00e5ff' }}>
                    {bus.edgeDevice.gpuUtil}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${bus.edgeDevice.gpuUtil}%`,
                    background: bus.edgeDevice.gpuUtil > 80 ? '#ef4444' : bus.edgeDevice.gpuUtil > 60 ? '#f59e0b' : '#00e5ff',
                  }}></div>
                </div>
              </div>

              {/* Temperature */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Temperature</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bus.edgeDevice.temp > 65 ? '#f59e0b' : '#22c55e' }}>
                    {bus.edgeDevice.temp}°C
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${(bus.edgeDevice.temp / 85) * 100}%`,
                    background: bus.edgeDevice.temp > 65 ? '#f59e0b' : '#22c55e',
                  }}></div>
                </div>
              </div>

              {/* FPS + Cameras */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  📹 {bus.edgeDevice.fps} FPS · {Math.round(bus.speed)} km/h
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {Object.values(bus.cameras).filter(Boolean).length} cams active
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
