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
          <div className="subtitle">Real-time urban transit & sensing intelligence overview — Nagpur</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenLiveCamera}
            className="btn btn-primary"
          >
            📹 Connect Live Camera & Vision
          </button>
          <span className="badge badge-active">
            <span className="live-dot"></span>
            LIVE
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
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
          bgColor="#eff6ff"
        />
        <KPICard
          label="Events Today"
          value={stats.eventsToday}
          icon="📊"
          trend="up"
          trendLabel="Real-time detections"
          bgColor="#f5f3ff"
        />
        <KPICard
          label="Active Alerts"
          value={stats.activeAlerts}
          icon="🚨"
          trend={stats.activeAlerts > 3 ? 'up' : 'neutral'}
          trendLabel="Critical & high severity"
          bgColor="#fef2f2"
        />
        <KPICard
          label="Duplicates Avoided"
          value={stats.duplicatesAvoided}
          icon="🔄"
          trend="down"
          trendLabel={`${stats.bandwidthSaved}% bandwidth saved`}
          bgColor="#ecfdf5"
        />
        <KPICard
          label="Fleet Coverage"
          value={stats.coveragePercent}
          icon="📡"
          trend="up"
          trendLabel="Road network scanned"
          bgColor="#fffbeb"
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
