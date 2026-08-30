import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NAGPUR_CENTER, busRoutes } from '../../data/nagpurRoutes';
import { GEOFENCE_ZONES } from '../../data/geofenceEngine';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom bus icon
function createBusIcon(color, isActive) {
  return L.divIcon({
    className: '',
    html: `<div class="bus-marker ${isActive ? 'active' : ''}" style="background: ${color}22; border-color: ${color}; color: ${color};">🚌</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Custom event icon
function createEventIcon(event) {
  return L.divIcon({
    className: '',
    html: `<div class="event-marker" style="background: ${event.color}35; border-color: ${event.color};">${event.icon}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Congestion HeatMap layer
function HeatLayer({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <>
      {data.map((point, i) => (
        <CircleMarker
          key={`heat-${i}`}
          center={[point[0], point[1]]}
          radius={Math.max(10, point[2] * 28)}
          pathOptions={{
            color: 'transparent',
            fillColor: point[2] > 0.7 ? '#ef4444' : point[2] > 0.4 ? '#f59e0b' : '#22c55e',
            fillOpacity: Math.min(0.45, point[2] * 0.55),
          }}
        />
      ))}
    </>
  );
}

// Road health overlay
function RoadHealthLayer({ segments }) {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) => (
        <CircleMarker
          key={`rh-${i}`}
          center={[seg.lat, seg.lng]}
          radius={7}
          pathOptions={{
            color: seg.score > 70 ? '#22c55e' : seg.score > 40 ? '#f59e0b' : '#ef4444',
            fillColor: seg.score > 70 ? '#22c55e' : seg.score > 40 ? '#f59e0b' : '#ef4444',
            fillOpacity: 0.75,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
              <strong>Road Health: {seg.score}/100</strong><br />
              Defects detected: {seg.defects}<br />
              Status: {seg.score > 70 ? '✅ Good' : seg.score > 40 ? '⚠️ Fair' : '🔴 Poor'}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export default function LiveMap({
  buses = [],
  events = [],
  congestionData = [],
  roadHealth = [],
  showRoutes = true,
  showHeatMap = true,
  showRoadHealth = false,
  showEvents = true,
  showGeofences = true,
  height = '100%',
}) {
  const mapRef = useRef(null);

  // Route polylines
  const routeLines = useMemo(() => {
    if (!showRoutes) return null;
    return busRoutes.map((route) => (
      <Polyline
        key={route.id}
        positions={route.waypoints}
        pathOptions={{
          color: route.color,
          weight: 3.5,
          opacity: 0.55,
          dashArray: '6 4',
        }}
      >
        <Popup>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
            <strong>{route.id}</strong>: {route.name}
          </div>
        </Popup>
      </Polyline>
    ));
  }, [showRoutes]);

  // Visible events (last 30 non-duplicate)
  const visibleEvents = useMemo(() => {
    return events
      .filter(e => !e.isDuplicate && e.type !== 'VEHICLE_COUNT')
      .slice(0, 30);
  }, [events]);

  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={NAGPUR_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        ref={mapRef}
      >
        {/* Fast reliable OpenStreetMap Tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Feature 2: Smart Geofence Zones Overlay */}
        {showGeofences && GEOFENCE_ZONES.map((zone) => (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '5 5',
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: zone.color }}>
                  {zone.icon} {zone.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: 6, lineHeight: 1.3 }}>
                  {zone.description}
                </div>
                <div style={{ background: `${zone.color}15`, padding: '4px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, color: zone.color }}>
                  🎯 {zone.focusLabel}
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Route lines */}
        {routeLines}

        {/* Congestion heat map */}
        {showHeatMap && <HeatLayer data={congestionData} />}

        {/* Road health overlay */}
        {showRoadHealth && <RoadHealthLayer segments={roadHealth} />}

        {/* Bus markers */}
        {buses.map((bus) => (
          bus.position && (
            <Marker
              key={bus.id}
              position={bus.position}
              icon={createBusIcon(bus.routeColor, bus.status === 'active')}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', minWidth: 190 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, color: bus.routeColor }}>
                    🚌 {bus.id}
                  </div>
                  <div style={{ display: 'grid', gap: 3 }}>
                    <div>Route: <strong>{bus.routeName}</strong></div>
                    <div>Speed: <strong>{Math.round(bus.speed)} km/h</strong></div>
                    <div>Status: <strong style={{ color: bus.status === 'active' ? '#16a34a' : '#64748b' }}>{bus.status}</strong></div>
                    {bus.activeZone && (
                      <div style={{ marginTop: 2, padding: '3px 6px', background: `${bus.activeZone.color}18`, borderRadius: 4, fontSize: '0.72rem', color: bus.activeZone.color, fontWeight: 600 }}>
                        {bus.activeZone.icon} Inside {bus.activeZone.name.split(' ')[0]} Zone
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, paddingTop: 4, borderTop: '1px solid #e2e8f0' }}>
                      FPS: <strong>{bus.edgeDevice.fps}</strong> · GPU: <strong>{bus.edgeDevice.gpuUtil}%</strong> · Latency: <strong>{bus.edgeDevice.inferenceLatency}ms</strong>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Event markers */}
        {showEvents && visibleEvents.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={createEventIcon(event)}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', minWidth: 210 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: event.color }}>
                  {event.icon} {event.label}
                </div>
                <div style={{ display: 'grid', gap: 3 }}>
                  <div>Severity: <strong>{event.severity}</strong></div>
                  <div>Confidence: <strong>{Math.round(event.confidence * 100)}%</strong></div>
                  <div>Bus: <strong>{event.busId}</strong> ({event.camera} cam)</div>
                  
                  {/* Sensor Fusion Status */}
                  {event.confirmedByIMU && (
                    <div style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '3px 6px', borderRadius: 4, fontWeight: 600 }}>
                      ⚡ IMU Verified Shock: {event.fusion?.zAxisPeak}g
                    </div>
                  )}
                  {event.isFalsePositive && (
                    <div style={{ fontSize: '0.72rem', color: '#d97706', background: '#fffbeb', padding: '3px 6px', borderRadius: 4, fontWeight: 600 }}>
                      ⚠️ Optical Alert: Zero IMU vibration (shadow/water)
                    </div>
                  )}

                  {/* Geofence Context */}
                  {event.geofenceZone && (
                    <div style={{ fontSize: '0.7rem', color: event.geofenceZone.color }}>
                      Zone: {event.geofenceZone.icon} {event.geofenceZone.name}
                    </div>
                  )}

                  {event.anpr && (
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #e2e8f0' }}>
                      Plate: <strong style={{ fontFamily: 'monospace' }}>{event.anpr.plateNumber}</strong> ({Math.round(event.anpr.ocrConfidence * 100)}%)<br />
                      Vehicle: {event.anpr.vehicleColor} {event.anpr.vehicleType}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
