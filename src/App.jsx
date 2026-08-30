import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/UI/Sidebar';
import AlertBanner from './components/UI/AlertBanner';
import LiveCameraModal from './components/UI/LiveCameraModal';
import { MobileHeader, MobileBottomNav } from './components/UI/MobileNav';
import CommandCenter from './pages/CommandCenter';
import FleetTracker from './pages/FleetTracker';
import RoadIntelligence from './pages/RoadIntelligence';
import TrafficAnalytics from './pages/TrafficAnalytics';
import IncidentManager from './pages/IncidentManager';
import EdgeMonitor from './pages/EdgeMonitor';
import CoverageAnalysis from './pages/CoverageAnalysis';
import FleetSimulator from './data/simulator';

function App() {
  const simulatorRef = useRef(null);
  const [buses, setBuses] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0, duplicatesAvoided: 0, activeAlerts: 0,
    eventsToday: 0, busesActive: 0, coveragePercent: 0,
    avgInferenceLatency: 0, bandwidthSaved: 0,
  });
  const [congestionData, setCongestionData] = useState([]);
  const [roadHealth, setRoadHealth] = useState([]);
  const [temporalData, setTemporalData] = useState({ decaying: [], repaired: [], summary: {} });
  const [fusionLogs, setFusionLogs] = useState([]);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Initialize simulator
  useEffect(() => {
    simulatorRef.current = new FleetSimulator();
    const initialState = simulatorRef.current.getState();
    setBuses(initialState.buses);
    setEvents(initialState.events);
    setStats(initialState.stats);
    if (initialState.temporalData) setTemporalData(initialState.temporalData);
    if (initialState.fusionLogs) setFusionLogs(initialState.fusionLogs);
  }, []);

  // Run simulation tick every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!simulatorRef.current) return;

      const result = simulatorRef.current.tick();
      setBuses(result.buses);
      setStats(result.stats);
      setCongestionData(result.congestionHeatData);
      setRoadHealth(result.roadHealth);
      if (result.temporalData) setTemporalData(result.temporalData);
      if (result.fusionLogs) setFusionLogs(result.fusionLogs);

      if (result.newEvents.length > 0) {
        setEvents(prev => [...result.newEvents, ...prev].slice(0, 200));

        // Check for critical alerts
        const critical = result.newEvents.find(
          e => e.severity === 'CRITICAL' && !e.isDuplicate
        );
        if (critical) {
          setCriticalAlert(critical);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const dismissAlert = useCallback(() => setCriticalAlert(null), []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Responsive Mobile Header */}
        <MobileHeader
          onToggleMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
          isMenuOpen={isMobileNavOpen}
          onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
          stats={stats}
        />

        {/* Sidebar with Mobile Drawer support */}
        <Sidebar
          stats={stats}
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />

        {criticalAlert && (
          <AlertBanner event={criticalAlert} onDismiss={dismissAlert} />
        )}

        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onEmitEvent={(event) => {
            setEvents(prev => [event, ...prev]);
            setCriticalAlert(event);
          }}
        />

        <div className="main-content">
          <Routes>
            <Route path="/" element={
              <CommandCenter
                buses={buses}
                events={events}
                stats={stats}
                congestionData={congestionData}
                roadHealth={roadHealth}
                fusionLogs={fusionLogs}
                temporalData={temporalData}
                onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
              />
            } />
            <Route path="/fleet" element={
              <FleetTracker buses={buses} stats={stats} />
            } />
            <Route path="/road" element={
              <RoadIntelligence
                buses={buses}
                events={events}
                roadHealth={roadHealth}
                temporalData={temporalData}
                fusionLogs={fusionLogs}
                stats={stats}
              />
            } />
            <Route path="/traffic" element={
              <TrafficAnalytics
                buses={buses}
                events={events}
                congestionData={congestionData}
              />
            } />
            <Route path="/incidents" element={
              <IncidentManager events={events} />
            } />
            <Route path="/edge" element={
              <EdgeMonitor
                buses={buses}
                onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
              />
            } />
            <Route path="/coverage" element={
              <CoverageAnalysis buses={buses} stats={stats} />
            } />
          </Routes>
        </div>

        {/* Responsive Mobile Bottom Navigation */}
        <MobileBottomNav
          onToggleMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
          stats={stats}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
