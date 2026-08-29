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
          <div className="subtitle">Onboard edge device health, inference metrics & bandwidth savings</div>
        </div>
        <button
          onClick={onOpenLiveCamera}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.8rem', boxShadow: 'var(--glow-cyan)' }}
        >
          📹 Open Live Camera & Edge Vision Stream
        </button>
      </div>

      <div className="kpi-grid stagger-children">
        <KPICard label="Avg Inference" value={avgLatency} icon="⚡" trend={avgLatency < 150 ? 'down' : 'up'} trendLabel="ms per frame (target ≤200ms)" accentColor="linear-gradient(135deg, #00e5ff, #06b6d4)" bgColor="rgba(0,229,255,0.12)" />
        <KPICard label="Avg FPS" value={avgFps} icon="🎬" trend="neutral" trendLabel="Frames processed/sec" accentColor="linear-gradient(135deg, #7c3aed, #a855f7)" bgColor="rgba(124,58,237,0.12)" />
        <KPICard label="Avg GPU Temp" value={avgTemp} icon="🌡️" trend={avgTemp > 65 ? 'up' : 'neutral'} trendLabel="°C (safe < 80°C)" accentColor="linear-gradient(135deg, #f59e0b, #d97706)" bgColor="rgba(245,158,11,0.12)" />
        <KPICard label="Avg GPU Load" value={avgGpu} icon="🖥️" trend="neutral" trendLabel="% utilization" accentColor="linear-gradient(135deg, #22c55e, #16a34a)" bgColor="rgba(34,197,94,0.12)" />
      </div>

      {/* Edge Device Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {buses.map((bus) => (
          <div key={bus.id} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                  background: bus.status === 'active' ? '#22c55e' : '#64748b',
                  boxShadow: bus.status === 'active' ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                }}></span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>🚌 {bus.id}</span>
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
