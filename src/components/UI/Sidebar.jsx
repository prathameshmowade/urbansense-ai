import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bus, Construction, BarChart3, ShieldAlert,
  Cpu, Map, FileText, Radio
} from 'lucide-react';

const navItems = [
  {
    section: 'Operations',
    items: [
      { path: '/', label: 'Command Center', icon: LayoutDashboard },
      { path: '/fleet', label: 'Fleet Tracker', icon: Bus },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { path: '/road', label: 'Road Intelligence', icon: Construction },
      { path: '/traffic', label: 'Traffic Analytics', icon: BarChart3 },
      { path: '/incidents', label: 'Incident Manager', icon: ShieldAlert },
    ],
  },
  {
    section: 'System',
    items: [
      { path: '/edge', label: 'Edge AI Monitor', icon: Cpu },
      { path: '/coverage', label: 'Coverage Analysis', icon: Map },
    ],
  },
];

export default function Sidebar({ stats }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">🛰️</div>
          <div className="logo-text">
            <span className="title">UrbanSense AI</span>
            <span className="subtitle">Mobile Intelligence</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="nav-icon" size={18} />
                <span>{item.label}</span>
                {item.path === '/incidents' && stats?.activeAlerts > 0 && (
                  <span className="nav-badge">{stats.activeAlerts}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot"></span>
          <span>
            <strong>{stats?.busesActive || 0}</strong> buses online ·{' '}
            <strong>{stats?.eventsToday || 0}</strong> events
          </span>
        </div>
      </div>
    </aside>
  );
}
