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
      <div className="page-header cc-header">
        <div className="cc-header-title-group">
          <div>
            <h1>Command Center</h1>
            <div className="subtitle">Real-time urban transit & sensing intelligence overview — Nagpur</div>
          </div>
        </div>

        <div className="cc-header-actions">
          {/* Quick Search Grid */}
          <div className="cc-search-wrap">
            <Search size={15} className="cc-search-icon" />
            <input
              type="text"
              placeholder="Search Nagpur grid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cc-search-input"
            />
          </div>

          <span className="cc-location-pill">📍 Nagpur</span>

          <button
            onClick={onOpenLiveCamera}
            className="btn btn-primary"
          >
            📹 Open Camera
          </button>

          <span className="badge badge-active cc-live-badge">
            <span className="live-dot"></span>
            LIVE
          </span>
        </div>
      </div>

      {/* Bento Grid Layout from Stitch — fully responsive via CSS */}
      <div className="cc-bento-grid">
        {/* Left Column: Bento KPI Cards */}
        <div className="cc-bento-kpis">
          {/* KPI 1: Total Fleet */}
          <div className="glass-card cc-bento-kpi-card">
            <div className="cc-kpi-label">Total Fleet</div>
            <div className="cc-kpi-row">
              <span className="cc-kpi-value">25</span>
              <span className="cc-kpi-trend-green">
                <ArrowUp size={13} /> 100% Online
              </span>
            </div>
            <div className="cc-kpi-sub">PM-eBus Sewa Nagpur</div>
          </div>

          {/* KPI 2: Active Alerts */}
          <div className="glass-card cc-bento-kpi-card">
            <div className="cc-kpi-label">Active Alerts</div>
            <div className="cc-kpi-row">
              <span className="cc-kpi-value" style={{ color: '#fd761a' }}>
                {stats.activeAlerts || 12}
              </span>
              <span className="cc-kpi-trend-red">
                <AlertTriangle size={13} /> {Math.min(stats.activeAlerts, 3)} Critical
              </span>
            </div>
            <div className="cc-kpi-sub">Real-time telemetry triggers</div>
          </div>

          {/* KPI 3: Total City Coverage with Progress Bar */}
          <div className="glass-card cc-bento-kpi-card">
            <div className="cc-kpi-label">Total City Coverage</div>
            <div className="cc-kpi-row">
              <span className="cc-kpi-value">
                {stats.coveragePercent || 78}%
              </span>
              <span className="cc-kpi-sub-inline">of target grid</span>
            </div>
            <div className="cc-progress-track">
              <div className="cc-progress-fill" style={{ width: `${stats.coveragePercent || 78}%` }} />
            </div>
          </div>

          {/* KPI 4: AI Inference Health */}
          <div className="glass-card cc-bento-kpi-card">
            <div className="cc-kpi-label">AI Inference Health</div>
            <div className="cc-kpi-row">
              <span className="cc-kpi-value" style={{ color: '#059669' }}>99.8%</span>
              <span className="cc-kpi-trend-green">
                <CheckCircle2 size={13} /> Optimal
              </span>
            </div>
            <div className="cc-kpi-sub">
              Jetson Orin Nano · Avg Latency: <strong>{stats.avgInferenceLatency || 14}ms</strong>
            </div>
          </div>
        </div>

        {/* Center Hero Map */}
        <div className="cc-bento-map">
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

        {/* Right Live Detection Feed */}
        <div className="cc-bento-feed">
          <EventFeed events={events} />
        </div>
      </div>

      {/* Bottom Panel: Detection Trends (Last 24h) */}
      <div className="glass-card cc-trends-panel">
        <div className="cc-trends-header">
          <div>
            <div className="cc-trends-title">Detection Trends (Last 24h)</div>
            <div className="cc-trends-sub">
              Hourly volume distribution of safety violations, road defects, and traffic anomalies
            </div>
          </div>
          <span className="cc-trends-badge">Nagpur Metropolitan Area</span>
        </div>
        <DetectionTrendsChart events={events} />
      </div>
    </div>
  );
}
