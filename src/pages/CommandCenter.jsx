import { useState } from 'react';
import { Bus, Radio, AlertTriangle, MapPin, Search, ArrowUp, Activity, CheckCircle2, TrendingUp, Video, Layers } from 'lucide-react';
import KPICard from '../components/UI/KPICard';
import EventFeed from '../components/UI/EventFeed';
import LiveMap from '../components/Map/LiveMap';
import { DetectionTrendsChart } from '../components/Charts/Charts';

export default function CommandCenter({
  buses = [],
  events = [],
  stats = {},
  congestionData = [],
  roadHealth = [],
  onOpenLiveCamera
}) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="page-container animate-fade-in">
      {/* Stitch-style Top Header */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Command Center
            </h1>
            <div className="subtitle">Real-time urban transit & sensing intelligence overview — Nagpur</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Search Grid */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Nagpur grid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px 7px 32px', fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
          </div>

          <span style={{
            padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)'
          }}>
            📍 Nagpur
          </span>

          <button
            onClick={onOpenLiveCamera}
            className="btn btn-primary"
            style={{ fontWeight: 700 }}
          >
            📹 Open Camera
          </button>

          <span className="badge badge-active" style={{ padding: '6px 10px' }}>
            <span className="live-dot"></span>
            LIVE
          </span>
        </div>
      </div>

      {/* Bento Grid Layout from Stitch */}
      <div className="grid grid-cols-12 gap-gutter" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, marginBottom: 16 }}>
        {/* Left Column: Bento KPI Cards (3 columns) */}
        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* KPI 1: Total Fleet */}
          <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Total Fleet
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>25</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ArrowUp size={13} /> 100% Online
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>PM-eBus Sewa Nagpur</div>
          </div>

          {/* KPI 2: Active Alerts */}
          <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Active Alerts
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fd761a', fontFamily: 'var(--font-mono)' }}>
                {stats.activeAlerts || 12}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 2 }}>
                <AlertTriangle size={13} /> {Math.min(stats.activeAlerts, 3)} Critical
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Real-time telemetry triggers</div>
          </div>

          {/* KPI 3: Total City Coverage with Progress Bar */}
          <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Total City Coverage
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {stats.coveragePercent || 78}%
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of target grid</span>
            </div>
            <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.coveragePercent || 78}%`, background: 'var(--primary)', borderRadius: 4 }} />
            </div>
          </div>

          {/* KPI 4: AI Inference Health */}
          <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              AI Inference Health
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)' }}>99.8%</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle2 size={13} /> Optimal
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Jetson Orin Nano · Avg Latency: <strong>{stats.avgInferenceLatency || 14}ms</strong>
            </div>
          </div>
        </div>

        {/* Center Hero Map (6 columns) */}
        <div style={{ gridColumn: 'span 6', minHeight: 460 }}>
          <LiveMap
            buses={buses}
            events={events}
            congestionData={congestionData}
            roadHealth={roadHealth}
            showRoutes={true}
            showHeatMap={true}
            showEvents={true}
            height="100%"
          />
        </div>

        {/* Right Live Detection Feed (3 columns) */}
        <div style={{ gridColumn: 'span 3', minHeight: 460 }}>
          <EventFeed events={events} />
        </div>
      </div>

      {/* Bottom Panel: Detection Trends (Last 24h) */}
      <div className="glass-card" style={{ marginTop: 8, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Detection Trends (Last 24h)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Hourly volume distribution of safety violations, road defects, and traffic anomalies
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-surface-subtle)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            Nagpur Metropolitan Area
          </span>
        </div>
        <DetectionTrendsChart events={events} />
      </div>
    </div>
  );
}
