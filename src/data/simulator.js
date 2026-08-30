// Fleet Simulator Engine — generates realistic bus movement + detection events
// Integrated with Sensor Fusion, Dynamic Geofencing, and Temporal Road Degradation Mapping
import { busRoutes, busFleet } from './nagpurRoutes.js';
import { EVENT_TYPES, generatePlateNumber, VEHICLE_CLASSES } from './eventTypes.js';
import { sensorFusion } from './sensorFusion.js';
import { geofenceEngine } from './geofenceEngine.js';
import { temporalMapper } from './temporalMapper.js';

// Haversine interpolation between two GPS points
function interpolate(p1, p2, t) {
  return [
    p1[0] + (p2[0] - p1[0]) * t,
    p1[1] + (p2[1] - p1[1]) * t,
  ];
}

// Add small random offset to simulate GPS jitter
function jitter(pos, meters = 5) {
  const deg = meters / 111320;
  return [
    pos[0] + (Math.random() - 0.5) * 2 * deg,
    pos[1] + (Math.random() - 0.5) * 2 * deg,
  ];
}

let eventCounter = 0;

function generateEventId() {
  eventCounter++;
  return `EVT-${Date.now()}-${eventCounter.toString().padStart(4, '0')}`;
}

// Random selection from weighted probabilities
function weightedRandom(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

// Event generation base probabilities (per tick per bus)
const BASE_EVENT_WEIGHTS = [
  { value: 'POTHOLE', weight: 0.15 },
  { value: 'CRACK', weight: 0.12 },
  { value: 'WATERLOGGING', weight: 0.05 },
  { value: 'DAMAGED_ROAD', weight: 0.06 },
  { value: 'MISSING_DIVIDER', weight: 0.04 },
  { value: 'MISSING_ZEBRA', weight: 0.05 },
  { value: 'DAMAGED_SIGNAGE', weight: 0.04 },
  { value: 'CONGESTION', weight: 0.12 },
  { value: 'VEHICLE_COUNT', weight: 0.10 },
  { value: 'RED_LIGHT_VIOLATION', weight: 0.03 },
  { value: 'SPEED_VIOLATION', weight: 0.05 },
  { value: 'HELMET_VIOLATION', weight: 0.06 },
  { value: 'PEDESTRIAN_RISK', weight: 0.04 },
  { value: 'SCHOOL_ZONE_ALERT', weight: 0.02 },
  { value: 'RASH_DRIVING', weight: 0.03 },
  { value: 'HIT_AND_RUN', weight: 0.01 },
  { value: 'ANPR_CAPTURE', weight: 0.03 },
];

const CAMERAS = ['front', 'rear', 'left', 'right'];

function generateDetection(bus, position, activeZone) {
  // Apply dynamic geofence weight tuning if inside specialized zone
  const activeWeights = geofenceEngine.getAdjustedWeights(BASE_EVENT_WEIGHTS, activeZone);
  const eventTypeKey = weightedRandom(activeWeights);
  const eventType = EVENT_TYPES[eventTypeKey];
  if (!eventType) return null;

  const rawConfidence = 0.65 + Math.random() * 0.34; // 0.65 - 0.99
  const camera = CAMERAS[Math.floor(Math.random() * CAMERAS.length)];

  const event = {
    id: generateEventId(),
    type: eventTypeKey,
    label: eventType.label,
    category: eventType.category,
    icon: eventType.icon,
    color: eventType.color,
    severity: eventType.defaultSeverity,
    confidence: Math.round(rawConfidence * 100) / 100,
    lat: position[0],
    lng: position[1],
    busId: bus.id,
    routeId: bus.routeId,
    routeName: bus.routeName,
    camera,
    timestamp: new Date().toISOString(),
    description: eventType.description,
    geofenceZone: activeZone ? {
      id: activeZone.id,
      name: activeZone.name,
      icon: activeZone.icon,
      color: activeZone.color,
    } : null,
  };

  // Feature 1: Vision + IoT Sensor Fusion for Road Defects
  if (['POTHOLE', 'CRACK', 'DAMAGED_ROAD', 'WATERLOGGING'].includes(eventTypeKey)) {
    const fusionResult = sensorFusion.correlate(event, bus);
    if (fusionResult) {
      event.fusion = fusionResult;
      event.confidence = fusionResult.fusionConfidence;
      if (!fusionResult.imuConfirmed) {
        event.isFalsePositive = true;
        event.severity = 'LOW';
        event.label = `${eventType.label} (Visual Only)`;
      } else {
        event.confirmedByIMU = true;
      }
    }

    // Feature 3: Temporal lifecycle observation
    temporalMapper.recordObservation(event, bus);
  }

  // Add ANPR data for incidents/violations
  if (['HIT_AND_RUN', 'ANPR_CAPTURE', 'RED_LIGHT_VIOLATION', 'SPEED_VIOLATION', 'RASH_DRIVING'].includes(eventTypeKey)) {
    event.anpr = {
      plateNumber: generatePlateNumber(),
      ocrConfidence: 0.82 + Math.random() * 0.17,
      vehicleType: VEHICLE_CLASSES[Math.floor(Math.random() * 4)].label,
      vehicleColor: ['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey'][Math.floor(Math.random() * 6)],
    };
  }

  // Add vehicle count data for traffic events
  if (eventTypeKey === 'VEHICLE_COUNT') {
    event.vehicleCounts = {
      car: Math.floor(Math.random() * 50) + 5,
      bus: Math.floor(Math.random() * 8),
      truck: Math.floor(Math.random() * 12),
      two_wheeler: Math.floor(Math.random() * 80) + 10,
      auto: Math.floor(Math.random() * 25) + 3,
      bicycle: Math.floor(Math.random() * 10),
      pedestrian: Math.floor(Math.random() * 30) + 2,
    };
    event.totalVehicles = Object.values(event.vehicleCounts).reduce((a, b) => a + b, 0);
  }

  // Add congestion metrics
  if (eventTypeKey === 'CONGESTION') {
    event.congestion = {
      level: ['Low', 'Moderate', 'High', 'Severe'][Math.floor(Math.random() * 4)],
      density: Math.floor(Math.random() * 100),
      avgSpeed: Math.floor(Math.random() * 40) + 5,
      queueLength: Math.floor(Math.random() * 200) + 10,
    };
  }

  // Speed violation details
  if (eventTypeKey === 'SPEED_VIOLATION') {
    event.speedData = {
      detected: Math.floor(Math.random() * 40) + 60,
      limit: activeZone?.id === 'ZONE_SCHOOL' ? 25 : 40,
    };
  }

  return event;
}

// Spatial deduplication state
const spatialClusters = new Map();

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function spatialDedup(event) {
  const clusterRadius = 15; // meters
  const key = event.type;
  
  if (!spatialClusters.has(key)) {
    spatialClusters.set(key, []);
  }
  
  const clusters = spatialClusters.get(key);
  
  for (const cluster of clusters) {
    const dist = haversineDistance(event.lat, event.lng, cluster.lat, cluster.lng);
    if (dist < clusterRadius) {
      cluster.count++;
      cluster.confidence = Math.min(0.99, cluster.confidence + 0.05);
      cluster.lastSeen = event.timestamp;
      cluster.reportingBuses.add(event.busId);
      return { isDuplicate: true, cluster };
    }
  }
  
  const newCluster = {
    id: event.id,
    type: event.type,
    lat: event.lat,
    lng: event.lng,
    confidence: event.confidence,
    count: 1,
    firstSeen: event.timestamp,
    lastSeen: event.timestamp,
    reportingBuses: new Set([event.busId]),
    severity: event.severity,
  };
  
  clusters.push(newCluster);
  
  // Cleanup old clusters
  const cutoff = Date.now() - 3 * 60 * 1000;
  spatialClusters.set(
    key,
    clusters.filter(c => new Date(c.lastSeen).getTime() > cutoff)
  );
  
  return { isDuplicate: false, cluster: newCluster };
}

// Fleet state management
class FleetSimulator {
  constructor() {
    this.buses = JSON.parse(JSON.stringify(busFleet));
    this.routes = busRoutes;
    this.events = [];
    this.stats = {
      totalEvents: 0,
      duplicatesAvoided: 0,
      activeAlerts: 0,
      eventsToday: 0,
      busesActive: 0,
      coveragePercent: 0,
      avgInferenceLatency: 0,
      bandwidthSaved: 0,
      imuConfirmedDefects: 0,
      falsePositivesFiltered: 0,
      activeDecayHotspots: 0,
      verifiedRepairsCount: 0,
    };
    this.congestionGrid = {};
    this.roadHealthSegments = {};
    this.coverageSegments = new Set();
    this.tickCount = 0;
    
    this._initBusPositions();
  }
  
  _initBusPositions() {
    for (const bus of this.buses) {
      const route = this.routes.find(r => r.id === bus.routeId);
      if (!route) continue;
      bus.waypointIndex = Math.floor(Math.random() * (route.waypoints.length - 1));
      bus.progress = Math.random();
      const wp = route.waypoints;
      const idx = bus.waypointIndex;
      const nextIdx = Math.min(idx + 1, wp.length - 1);
      const pos = interpolate(wp[idx], wp[nextIdx], bus.progress);
      bus.position = jitter(pos);
      bus.speed = 15 + Math.random() * 35;
      bus.activeZone = geofenceEngine.checkZone(bus.position);
    }
  }
  
  tick() {
    this.tickCount++;
    const newEvents = [];

    // Periodic simulation of municipal repair verification
    temporalMapper.simulateRepairVerification(this.tickCount);
    
    for (const bus of this.buses) {
      if (bus.status !== 'active') continue;
      
      const route = this.routes.find(r => r.id === bus.routeId);
      if (!route) continue;
      
      // Move bus along route
      const speedFactor = (bus.speed / 40) * 0.08;
      bus.progress += speedFactor;
      
      if (bus.progress >= 1) {
        bus.progress = 0;
        bus.waypointIndex += bus.direction;
        
        if (bus.waypointIndex >= route.waypoints.length - 1) {
          bus.direction = -1;
          bus.waypointIndex = route.waypoints.length - 1;
        } else if (bus.waypointIndex <= 0) {
          bus.direction = 1;
          bus.waypointIndex = 0;
        }
      }
      
      const wp = route.waypoints;
      const idx = bus.waypointIndex;
      const nextIdx = Math.min(Math.max(idx + bus.direction, 0), wp.length - 1);
      const pos = interpolate(wp[idx], wp[nextIdx], bus.progress);
      bus.position = jitter(pos);
      
      // Check for active Geofence zone
      bus.activeZone = geofenceEngine.checkZone(bus.position);
      
      // Vary speed
      bus.speed = Math.max(5, Math.min(60, bus.speed + (Math.random() - 0.5) * 5));
      
      // Update edge device stats
      bus.edgeDevice.fps = bus.speed > 30 ? 8 + Math.floor(Math.random() * 7) : 2 + Math.floor(Math.random() * 4);
      bus.edgeDevice.gpuUtil = 30 + Math.floor(Math.random() * 60);
      bus.edgeDevice.temp = 42 + Math.floor(Math.random() * 25);
      bus.edgeDevice.inferenceLatency = 60 + Math.floor(Math.random() * 140);
      
      // Track coverage
      const gridKey = `${Math.round(pos[0] * 500)}_${Math.round(pos[1] * 500)}`;
      this.coverageSegments.add(gridKey);
      
      // Generate detection events (probability per tick)
      if (Math.random() < 0.15) {
        const event = generateDetection(bus, bus.position, bus.activeZone);
        if (event) {
          const { isDuplicate, cluster } = spatialDedup(event);
          
          if (isDuplicate) {
            this.stats.duplicatesAvoided++;
            event.isDuplicate = true;
            event.clusterId = cluster.id;
            event.clusterCount = cluster.count;
            event.crossVerified = cluster.reportingBuses.size > 1;
          } else {
            this.stats.eventsToday++;
          }
          
          this.events.unshift(event);
          if (this.events.length > 500) this.events.pop();
          newEvents.push(event);
          this.stats.totalEvents++;
          
          // Update congestion grid
          if (event.type === 'CONGESTION' || event.type === 'VEHICLE_COUNT') {
            const cgKey = `${Math.round(pos[0] * 200)}_${Math.round(pos[1] * 200)}`;
            this.congestionGrid[cgKey] = {
              lat: pos[0],
              lng: pos[1],
              intensity: event.congestion ? event.congestion.density / 100 : Math.random() * 0.7 + 0.3,
              timestamp: event.timestamp,
            };
          }
          
          // Update road health
          if (['POTHOLE', 'CRACK', 'DAMAGED_ROAD', 'WATERLOGGING'].includes(event.type) && !event.isFalsePositive) {
            const rhKey = `${Math.round(pos[0] * 300)}_${Math.round(pos[1] * 300)}`;
            if (!this.roadHealthSegments[rhKey]) {
              this.roadHealthSegments[rhKey] = { lat: pos[0], lng: pos[1], defects: 0, score: 100 };
            }
            this.roadHealthSegments[rhKey].defects++;
            this.roadHealthSegments[rhKey].score = Math.max(0, 100 - this.roadHealthSegments[rhKey].defects * 15);
          }
        }
      }
    }
    
    // Update aggregate stats
    const fusionStats = sensorFusion.getStats();
    const temporalStats = temporalMapper.getTemporalSummary();

    this.stats.busesActive = this.buses.filter(b => b.status === 'active').length;
    this.stats.activeAlerts = this.events.filter(e => 
      ['CRITICAL', 'HIGH'].includes(e.severity) && 
      Date.now() - new Date(e.timestamp).getTime() < 60000
    ).length;
    this.stats.coveragePercent = Math.min(99, Math.round(this.coverageSegments.size / 5 * 100) / 100);
    this.stats.avgInferenceLatency = Math.round(
      this.buses.reduce((sum, b) => sum + b.edgeDevice.inferenceLatency, 0) / this.buses.length
    );
    this.stats.bandwidthSaved = Math.round(
      (this.stats.duplicatesAvoided / Math.max(1, this.stats.totalEvents)) * 100
    );
    this.stats.imuConfirmedDefects = fusionStats.confirmedCount;
    this.stats.falsePositivesFiltered = fusionStats.falsePositivesFiltered;
    this.stats.activeDecayHotspots = temporalStats.activeDecayHotspots;
    this.stats.verifiedRepairsCount = temporalStats.verifiedRepairsCount;
    
    return {
      buses: this.buses.map(b => ({
        ...b,
        position: b.position,
        activeZone: b.activeZone,
        edgeDevice: { ...b.edgeDevice },
      })),
      newEvents,
      stats: { ...this.stats },
      congestionHeatData: Object.values(this.congestionGrid).map(c => [c.lat, c.lng, c.intensity]),
      roadHealth: Object.values(this.roadHealthSegments),
      temporalData: {
        decaying: temporalMapper.getDecayingLocations(),
        repaired: temporalMapper.getRepairedLocations(),
        summary: temporalStats,
      },
      fusionLogs: sensorFusion.getRecentLogs(8),
    };
  }
  
  getState() {
    const temporalStats = temporalMapper.getTemporalSummary();
    return {
      buses: this.buses.map(b => ({
        ...b,
        position: b.position,
        activeZone: b.activeZone,
        edgeDevice: { ...b.edgeDevice },
      })),
      events: this.events.slice(0, 100),
      stats: { ...this.stats },
      congestionHeatData: Object.values(this.congestionGrid).map(c => [c.lat, c.lng, c.intensity]),
      roadHealth: Object.values(this.roadHealthSegments),
      temporalData: {
        decaying: temporalMapper.getDecayingLocations(),
        repaired: temporalMapper.getRepairedLocations(),
        summary: temporalStats,
      },
      fusionLogs: sensorFusion.getRecentLogs(8),
    };
  }
}

export default FleetSimulator;
