import { Bus, Radio, AlertTriangle, MapPin } from 'lucide-react';
import KPICard from '../components/UI/KPICard';
import EventFeed from '../components/UI/EventFeed';
import LiveMap from '../components/Map/LiveMap';
import { EventTimelineChart } from '../components/Charts/Charts';

export default function CommandCenter({ buses, events, stats, congestionData, roadHealth, onOpenLiveCamera }) {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Command Center</h1>
          <div className="subtitle">Real-time urban intelligence overview — Nagpur</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onOpenLiveCamera}
            className="btn btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.78rem', boxShadow: 'var(--glow-cyan)' }}
          >
            📹 Connect Live Camera & AI Vision
          </button>
          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            LIVE
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid stagger-children">
        <KPICard
          label="Active Buses"
          value={stats.busesActive}
          icon="🚌"
          trend="up"
          trendLabel={`${stats.busesActive}/25 fleet online`}
          accentColor="linear-gradient(135deg, #00e5ff, #06b6d4)"
          bgColor="rgba(0, 229, 255, 0.12)"
        />
        <KPICard
          label="Events Today"
          value={stats.eventsToday}
          icon="📊"
          trend="up"
          trendLabel="Real-time detections"
          accentColor="linear-gradient(135deg, #7c3aed, #a855f7)"
          bgColor="rgba(124, 58, 237, 0.12)"
        />
        <KPICard
          label="Active Alerts"
          value={stats.activeAlerts}
          icon="🚨"
          trend={stats.activeAlerts > 3 ? 'up' : 'neutral'}
          trendLabel="Critical & high severity"
          accentColor="linear-gradient(135deg, #ef4444, #dc2626)"
          bgColor="rgba(239, 68, 68, 0.12)"
        />
        <KPICard
          label="Duplicates Avoided"
          value={stats.duplicatesAvoided}
          icon="🔄"
          trend="down"
          trendLabel={`${stats.bandwidthSaved}% bandwidth saved`}
          accentColor="linear-gradient(135deg, #22c55e, #16a34a)"
          bgColor="rgba(34, 197, 94, 0.12)"
        />
        <KPICard
          label="Fleet Coverage"
          value={stats.coveragePercent}
          icon="📡"
          trend="up"
          trendLabel="Road network scanned"
          accentColor="linear-gradient(135deg, #f59e0b, #eab308)"
          bgColor="rgba(245, 158, 11, 0.12)"
        />
      </div>

      {/* Main Content — Map + Feed */}
      <div className="grid-main-side">
        <LiveMap
          buses={buses}
          events={events}
          congestionData={congestionData}
          roadHealth={roadHealth}
          showRoutes={true}
          showHeatMap={true}
          showEvents={true}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          <EventFeed events={events} />
        </div>
      </div>
    </div>
  );
}
