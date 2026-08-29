// Event type definitions for all detection modules

export const SEVERITY = {
  CRITICAL: { level: 4, label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  HIGH: { level: 3, label: 'High', color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  MEDIUM: { level: 2, label: 'Medium', color: '#EAB308', bg: 'rgba(234,179,8,0.15)' },
  LOW: { level: 1, label: 'Low', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  INFO: { level: 0, label: 'Info', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
};

export const EVENT_CATEGORIES = {
  ROAD_DEFECT: { label: 'Road Defect', icon: '🕳️', color: '#F97316' },
  TRAFFIC: { label: 'Traffic', icon: '🚗', color: '#3B82F6' },
  SAFETY: { label: 'Safety', icon: '⚠️', color: '#EAB308' },
  INCIDENT: { label: 'Incident', icon: '🚨', color: '#EF4444' },
  VIOLATION: { label: 'Violation', icon: '🚦', color: '#A855F7' },
  INFRASTRUCTURE: { label: 'Infrastructure', icon: '🏗️', color: '#06B6D4' },
};

export const EVENT_TYPES = {
  // Module 3 — Road/Defect Intelligence
  POTHOLE: {
    id: 'POTHOLE',
    label: 'Pothole Detected',
    category: 'ROAD_DEFECT',
    icon: '🕳️',
    color: '#F97316',
    defaultSeverity: 'MEDIUM',
    description: 'Road surface pothole detected',
  },
  CRACK: {
    id: 'CRACK',
    label: 'Road Crack',
    category: 'ROAD_DEFECT',
    icon: '⚡',
    color: '#FB923C',
    defaultSeverity: 'LOW',
    description: 'Road surface cracking detected',
  },
  WATERLOGGING: {
    id: 'WATERLOGGING',
    label: 'Waterlogging',
    category: 'ROAD_DEFECT',
    icon: '🌊',
    color: '#0EA5E9',
    defaultSeverity: 'HIGH',
    description: 'Water accumulation on road surface',
  },
  DAMAGED_ROAD: {
    id: 'DAMAGED_ROAD',
    label: 'Damaged Road Surface',
    category: 'ROAD_DEFECT',
    icon: '🛣️',
    color: '#DC2626',
    defaultSeverity: 'HIGH',
    description: 'Significant road surface damage',
  },

  // Module 3 — Infrastructure Deficiency
  MISSING_DIVIDER: {
    id: 'MISSING_DIVIDER',
    label: 'Missing Road Divider',
    category: 'INFRASTRUCTURE',
    icon: '🚧',
    color: '#06B6D4',
    defaultSeverity: 'MEDIUM',
    description: 'Road divider missing or damaged',
  },
  MISSING_ZEBRA: {
    id: 'MISSING_ZEBRA',
    label: 'Missing Zebra Crossing',
    category: 'INFRASTRUCTURE',
    icon: '🦓',
    color: '#8B5CF6',
    defaultSeverity: 'MEDIUM',
    description: 'Zebra crossing markings absent or faded',
  },
  DAMAGED_SIGNAGE: {
    id: 'DAMAGED_SIGNAGE',
    label: 'Damaged/Missing Signage',
    category: 'INFRASTRUCTURE',
    icon: '🪧',
    color: '#D946EF',
    defaultSeverity: 'MEDIUM',
    description: 'Traffic signboard damaged or missing',
  },

  // Module 4 — Traffic Intelligence
  CONGESTION: {
    id: 'CONGESTION',
    label: 'Traffic Congestion',
    category: 'TRAFFIC',
    icon: '🚗',
    color: '#EF4444',
    defaultSeverity: 'MEDIUM',
    description: 'High vehicle density / congestion detected',
  },
  VEHICLE_COUNT: {
    id: 'VEHICLE_COUNT',
    label: 'Vehicle Count Update',
    category: 'TRAFFIC',
    icon: '📊',
    color: '#3B82F6',
    defaultSeverity: 'INFO',
    description: 'Periodic vehicle count and classification',
  },

  // Module 5 — Junction & Violation Intelligence
  RED_LIGHT_VIOLATION: {
    id: 'RED_LIGHT_VIOLATION',
    label: 'Red Light Violation',
    category: 'VIOLATION',
    icon: '🔴',
    color: '#DC2626',
    defaultSeverity: 'CRITICAL',
    description: 'Vehicle ran a red light',
  },
  SPEED_VIOLATION: {
    id: 'SPEED_VIOLATION',
    label: 'Speed Violation',
    category: 'VIOLATION',
    icon: '💨',
    color: '#F59E0B',
    defaultSeverity: 'HIGH',
    description: 'Vehicle exceeding speed limit',
  },
  HELMET_VIOLATION: {
    id: 'HELMET_VIOLATION',
    label: 'No Helmet Detected',
    category: 'VIOLATION',
    icon: '⛑️',
    color: '#A855F7',
    defaultSeverity: 'MEDIUM',
    description: 'Two-wheeler rider without helmet',
  },

  // Module 6 — Safety Intelligence
  PEDESTRIAN_RISK: {
    id: 'PEDESTRIAN_RISK',
    label: 'Pedestrian at Risk',
    category: 'SAFETY',
    icon: '🚶',
    color: '#EAB308',
    defaultSeverity: 'HIGH',
    description: 'Pedestrian in vulnerable position on road',
  },
  SCHOOL_ZONE_ALERT: {
    id: 'SCHOOL_ZONE_ALERT',
    label: 'School Zone Alert',
    category: 'SAFETY',
    icon: '🏫',
    color: '#F59E0B',
    defaultSeverity: 'HIGH',
    description: 'Children crossing detected near school zone',
  },
  RASH_DRIVING: {
    id: 'RASH_DRIVING',
    label: 'Rash Driving Detected',
    category: 'SAFETY',
    icon: '⚠️',
    color: '#DC2626',
    defaultSeverity: 'CRITICAL',
    description: 'Dangerous driving behavior detected',
  },

  // Module 7 — Incident / ANPR
  HIT_AND_RUN: {
    id: 'HIT_AND_RUN',
    label: 'Hit & Run Detected',
    category: 'INCIDENT',
    icon: '🚨',
    color: '#EF4444',
    defaultSeverity: 'CRITICAL',
    description: 'Hit-and-run incident detected with vehicle tracking',
  },
  ANPR_CAPTURE: {
    id: 'ANPR_CAPTURE',
    label: 'Number Plate Captured',
    category: 'INCIDENT',
    icon: '📸',
    color: '#10B981',
    defaultSeverity: 'INFO',
    description: 'Vehicle registration number extracted',
  },
};

// Indian number plate patterns for simulation
export const INDIAN_PLATE_PATTERNS = [
  'MH-31', 'MH-40', 'MH-49', 'MH-04', 'MH-12',
  'MH-01', 'MH-02', 'MH-03', 'MH-14', 'MH-15',
];

export const generatePlateNumber = () => {
  const state = INDIAN_PLATE_PATTERNS[Math.floor(Math.random() * INDIAN_PLATE_PATTERNS.length)];
  const alpha = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${state} ${alpha} ${num}`;
};

// Vehicle classifications
export const VEHICLE_CLASSES = [
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'bus', label: 'Bus', icon: '🚌' },
  { id: 'truck', label: 'Truck', icon: '🚛' },
  { id: 'two_wheeler', label: 'Two-Wheeler', icon: '🏍️' },
  { id: 'auto', label: 'Auto-Rickshaw', icon: '🛺' },
  { id: 'bicycle', label: 'Bicycle', icon: '🚲' },
  { id: 'pedestrian', label: 'Pedestrian', icon: '🚶' },
];
