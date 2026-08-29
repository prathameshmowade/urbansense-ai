// Nagpur bus route GPS waypoints — major corridors
// Routes based on actual Nagpur public bus network layout

export const NAGPUR_CENTER = [21.1458, 79.0882];
export const NAGPUR_BOUNDS = [[21.08, 78.98], [21.22, 79.18]];

export const busRoutes = [
  {
    id: 'NR-01',
    name: 'Sitabuldi → Hingna',
    color: '#00E5FF',
    waypoints: [
      [21.1440, 79.0830], [21.1425, 79.0790], [21.1398, 79.0735],
      [21.1370, 79.0680], [21.1345, 79.0625], [21.1310, 79.0560],
      [21.1280, 79.0500], [21.1250, 79.0440], [21.1215, 79.0375],
      [21.1180, 79.0310], [21.1145, 79.0250], [21.1100, 79.0180],
    ],
  },
  {
    id: 'NR-02',
    name: 'Sitabuldi → Kamptee',
    color: '#FF6B6B',
    waypoints: [
      [21.1440, 79.0830], [21.1475, 79.0850], [21.1510, 79.0870],
      [21.1555, 79.0890], [21.1600, 79.0910], [21.1650, 79.0925],
      [21.1700, 79.0940], [21.1755, 79.0960], [21.1810, 79.0975],
      [21.1870, 79.0990], [21.1930, 79.1010], [21.2000, 79.1040],
    ],
  },
  {
    id: 'NR-03',
    name: 'Railway Station → Wadi',
    color: '#FFD93D',
    waypoints: [
      [21.1495, 79.0880], [21.1500, 79.0920], [21.1510, 79.0970],
      [21.1525, 79.1025], [21.1540, 79.1080], [21.1560, 79.1140],
      [21.1575, 79.1200], [21.1590, 79.1260], [21.1610, 79.1320],
      [21.1630, 79.1380], [21.1650, 79.1440], [21.1670, 79.1510],
    ],
  },
  {
    id: 'NR-04',
    name: 'Dharampeth → Manewada',
    color: '#A855F7',
    waypoints: [
      [21.1500, 79.0750], [21.1480, 79.0790], [21.1460, 79.0840],
      [21.1435, 79.0890], [21.1410, 79.0945], [21.1380, 79.1000],
      [21.1350, 79.1055], [21.1320, 79.1110], [21.1285, 79.1170],
      [21.1250, 79.1225], [21.1210, 79.1280], [21.1170, 79.1340],
    ],
  },
  {
    id: 'NR-05',
    name: 'Gandhibagh → Wardha Road',
    color: '#34D399',
    waypoints: [
      [21.1520, 79.0900], [21.1490, 79.0930], [21.1455, 79.0960],
      [21.1420, 79.0995], [21.1385, 79.1030], [21.1345, 79.1065],
      [21.1305, 79.1100], [21.1260, 79.1140], [21.1215, 79.1175],
      [21.1170, 79.1210], [21.1120, 79.1250], [21.1065, 79.1295],
    ],
  },
  {
    id: 'NR-06',
    name: 'Laxmi Nagar → Koradi',
    color: '#F97316',
    waypoints: [
      [21.1380, 79.0850], [21.1420, 79.0870], [21.1465, 79.0895],
      [21.1510, 79.0920], [21.1560, 79.0950], [21.1615, 79.0985],
      [21.1670, 79.1020], [21.1730, 79.1055], [21.1790, 79.1095],
      [21.1850, 79.1130], [21.1910, 79.1170], [21.1975, 79.1215],
    ],
  },
  {
    id: 'NR-07',
    name: 'Ambazari → Besa',
    color: '#EC4899',
    waypoints: [
      [21.1350, 79.0600], [21.1320, 79.0650], [21.1290, 79.0705],
      [21.1255, 79.0760], [21.1220, 79.0820], [21.1185, 79.0880],
      [21.1145, 79.0940], [21.1105, 79.1000], [21.1065, 79.1065],
      [21.1020, 79.1130], [21.0975, 79.1195], [21.0925, 79.1260],
    ],
  },
  {
    id: 'NR-08',
    name: 'Sadar → Nandanvan',
    color: '#06B6D4',
    waypoints: [
      [21.1560, 79.0810], [21.1540, 79.0850], [21.1515, 79.0895],
      [21.1490, 79.0940], [21.1460, 79.0990], [21.1430, 79.1040],
      [21.1395, 79.1090], [21.1360, 79.1140], [21.1325, 79.1195],
      [21.1285, 79.1245], [21.1245, 79.1300], [21.1200, 79.1355],
    ],
  },
];

// Generate bus fleet (25 buses spread across routes)
export const busFleet = [];
const busNames = [
  'NMC-E001', 'NMC-E002', 'NMC-E003', 'NMC-E004', 'NMC-E005',
  'NMC-E006', 'NMC-E007', 'NMC-E008', 'NMC-E009', 'NMC-E010',
  'NMC-E011', 'NMC-E012', 'NMC-E013', 'NMC-E014', 'NMC-E015',
  'NMC-E016', 'NMC-E017', 'NMC-E018', 'NMC-E019', 'NMC-E020',
  'NMC-E021', 'NMC-E022', 'NMC-E023', 'NMC-E024', 'NMC-E025',
];

for (let i = 0; i < 25; i++) {
  const route = busRoutes[i % busRoutes.length];
  busFleet.push({
    id: busNames[i],
    routeId: route.id,
    routeName: route.name,
    routeColor: route.color,
    waypointIndex: Math.floor(Math.random() * route.waypoints.length),
    speed: 20 + Math.random() * 30, // 20-50 km/h
    direction: Math.random() > 0.5 ? 1 : -1,
    status: Math.random() > 0.1 ? 'active' : 'idle',
    cameras: { front: true, rear: true, left: true, right: true, cabin: true },
    edgeDevice: {
      model: 'Jetson Orin Nano',
      fps: 5 + Math.floor(Math.random() * 10),
      gpuUtil: 40 + Math.floor(Math.random() * 50),
      temp: 45 + Math.floor(Math.random() * 20),
      inferenceLatency: 80 + Math.floor(Math.random() * 120),
    },
  });
}
