import { NavLink } from 'react-router-dom';
import {
  Menu, X, LayoutDashboard, Bus, Construction, ShieldAlert,
  BarChart3, Camera, Radio
} from 'lucide-react';

export function MobileHeader({ onToggleMenu, isMenuOpen, onOpenLiveCamera, stats }) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMenu}
          aria-label={isMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-logo">
          <div className="mobile-logo-icon">🛰️</div>
          <div className="mobile-logo-text">
            <span className="mobile-title">UrbanSense AI</span>
            <span className="mobile-live-status">
              <span className="live-dot"></span>
              {stats?.busesActive || 0} buses online
            </span>
          </div>
        </div>
      </div>

      <div className="mobile-header-right">
        {onOpenLiveCamera && (
          <button
            onClick={onOpenLiveCamera}
            className="mobile-cam-btn"
            title="Open Live Edge Vision Stream"
          >
            <Camera size={16} />
            <span>Live AI</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function MobileBottomNav({ onToggleMenu, stats }) {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Command</span>
      </NavLink>

      <NavLink
        to="/fleet"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Bus size={20} />
        <span>Fleet</span>
      </NavLink>

      <NavLink
        to="/road"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Construction size={20} />
        <span>Roads</span>
      </NavLink>

      <NavLink
        to="/incidents"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <ShieldAlert size={20} />
          {stats?.activeAlerts > 0 && (
            <span className="bottom-nav-badge">{stats.activeAlerts}</span>
          )}
        </div>
        <span>Alerts</span>
      </NavLink>

      <button
        onClick={onToggleMenu}
        className="bottom-nav-item menu-trigger"
        aria-label="Toggle full navigation drawer"
      >
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}
