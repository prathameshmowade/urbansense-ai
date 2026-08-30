// Geofence Engine — Dynamic Context-Aware YOLO Weight Tuning
// Dynamically boosts safety/violation priorities in high-risk zones (Schools, Hospitals, Expressways)

export const GEOFENCE_ZONES = [
  {
    id: 'ZONE_SCHOOL',
    name: 'School & University Zone',
    category: 'EDUCATION',
    center: [21.1275, 79.0520], // Near VNIT / South Ambazari Road
    radius: 650, // meters
    color: '#F59E0B',
    fillColor: 'rgba(245, 158, 11, 0.18)',
    icon: '🏫',
    description: 'Prioritizes child pedestrian safety, school zone alerts, and reckless driving detection.',
    focusLabel: 'Focus: Child Pedestrian & Rash Driving Detection',
    boostWeights: {
      SCHOOL_ZONE_ALERT: 4.0,
      PEDESTRIAN_RISK: 3.5,
      RASH_DRIVING: 3.0,
      SPEED_VIOLATION: 2.0,
    },
    suppressWeights: {
      MISSING_DIVIDER: 0.1,
      CONGESTION: 0.3,
      VEHICLE_COUNT: 0.3,
    },
  },
  {
    id: 'ZONE_HOSPITAL',
    name: 'Medical Square & Hospital Zone',
    category: 'HEALTHCARE',
    center: [21.1340, 79.0980], // Medical Square Nagpur
    radius: 600,
    color: '#EF4444',
    fillColor: 'rgba(239, 68, 68, 0.18)',
    icon: '🏥',
    description: 'Ensures clear emergency ambulance corridors, pedestrian patient safety, and zero lane-blocking.',
    focusLabel: 'Focus: Emergency Corridor Clearance & Pedestrian Safety',
    boostWeights: {
      PEDESTRIAN_RISK: 3.5,
      RASH_DRIVING: 3.0,
      CONGESTION: 2.5,
      RED_LIGHT_VIOLATION: 2.5,
    },
    suppressWeights: {
      HELMET_VIOLATION: 0.2,
      MISSING_ZEBRA: 0.2,
    },
  },
  {
    id: 'ZONE_HIGHWAY',
    name: 'Wardha Road High-Speed Corridor',
    category: 'EXPRESSWAY',
    center: [21.1150, 79.0650], // Wardha Road corridor
    radius: 850,
    color: '#3B82F6',
    fillColor: 'rgba(59, 130, 246, 0.18)',
    icon: '🛣️',
    description: 'Focuses on high-speed violations, hit & run tracking, asphalt degradation, and divider hazards.',
    focusLabel: 'Focus: High-Speed Radar, ANPR & Structural Asphalt Integrity',
    boostWeights: {
      SPEED_VIOLATION: 4.5,
      POTHOLE: 2.8,
      DAMAGED_ROAD: 2.5,
      HIT_AND_RUN: 2.5,
      MISSING_DIVIDER: 2.5,
    },
    suppressWeights: {
      PEDESTRIAN_RISK: 0.05,
      SCHOOL_ZONE_ALERT: 0.0,
      BICYCLE: 0.1,
    },
  },
  {
    id: 'ZONE_MARKET',
    name: 'Sitabuldi Central Commercial Hub',
    category: 'COMMERCIAL',
    center: [21.1440, 79.0830], // Sitabuldi Interchange
    radius: 550,
    color: '#8B5CF6',
    fillColor: 'rgba(139, 92, 246, 0.18)',
    icon: '🛍️',
    description: 'High-density zone focusing on vehicle count distribution, bottleneck gridlock, and helmet violations.',
    focusLabel: 'Focus: Micro-Congestion Heatmapping & Multi-Class Vehicle Counts',
    boostWeights: {
      CONGESTION: 3.5,
      VEHICLE_COUNT: 3.0,
      HELMET_VIOLATION: 2.5,
      PEDESTRIAN_RISK: 2.0,
    },
    suppressWeights: {
      SPEED_VIOLATION: 0.1,
      MISSING_DIVIDER: 0.2,
    },
  },
];

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class GeofenceEngine {
  constructor(zones = GEOFENCE_ZONES) {
    this.zones = zones;
    this.activeBusZones = new Map(); // busId -> zone
  }

  /**
   * Determine which geofence zone contains a given coordinate
   * @param {Array<number>} position - [lat, lng]
   * @returns {Object|null} Matching zone or null
   */
  checkZone(position) {
    if (!position || position.length < 2) return null;
    const [lat, lng] = position;

    for (const zone of this.zones) {
      const dist = haversineDistance(lat, lng, zone.center[0], zone.center[1]);
      if (dist <= zone.radius) {
        return {
          ...zone,
          distanceToCenterMeters: Math.round(dist),
        };
      }
    }
    return null;
  }

  /**
   * Adjust baseline detection event probabilities based on current zone context
   * @param {Array<Object>} baseWeights - [{ value: 'POTHOLE', weight: 0.15 }, ...]
   * @param {Object|null} zone - Active zone
   * @returns {Array<Object>} Tuned weights array
   */
  getAdjustedWeights(baseWeights, zone) {
    if (!zone) return baseWeights;

    return baseWeights.map(item => {
      let multiplier = 1.0;
      if (zone.boostWeights && zone.boostWeights[item.value] !== undefined) {
        multiplier = zone.boostWeights[item.value];
      } else if (zone.suppressWeights && zone.suppressWeights[item.value] !== undefined) {
        multiplier = zone.suppressWeights[item.value];
      }

      return {
        value: item.value,
        weight: item.weight * multiplier,
      };
    });
  }

  getAllZones() {
    return this.zones;
  }
}

export const geofenceEngine = new GeofenceEngine();
export default GeofenceEngine;
