import { useRef, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// Base tooltip & font theme for light UI
const basePlugins = {
  legend: {
    labels: {
      color: '#475569',
      font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
      padding: 10,
      usePointStyle: true,
      pointStyleWidth: 8,
    },
  },
  tooltip: {
    backgroundColor: '#0f172a',
    titleColor: '#ffffff',
    bodyColor: '#cbd5e1',
    borderColor: '#334155',
    borderWidth: 1,
    cornerRadius: 6,
    padding: 9,
    titleFont: { family: "'Inter', sans-serif", weight: '600', size: 11 },
    bodyFont: { family: "'Inter', sans-serif", size: 11 },
  },
};

// Cartesian scales for Bar and Line charts
const cartesianScales = {
  x: {
    ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 10 } },
    grid: { color: '#f1f5f9' },
    border: { color: '#e2e8f0' },
  },
  y: {
    ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 10 } },
    grid: { color: '#f1f5f9' },
    border: { color: '#e2e8f0' },
  },
};

const LABEL_MAP = {
  POTHOLE: 'Pothole',
  CRACK: 'Crack',
  WATERLOGGING: 'Waterlogging',
  DAMAGED_ROAD: 'Damaged Road',
  MISSING_DIVIDER: 'Missing Divider',
  MISSING_ZEBRA: 'Missing Zebra',
  DAMAGED_SIGNAGE: 'Damaged Signage',
};

export function DefectBreakdown({ events }) {
  const data = useMemo(() => {
    const counts = {};
    events.forEach((e) => {
      if (['POTHOLE', 'CRACK', 'WATERLOGGING', 'DAMAGED_ROAD', 'MISSING_DIVIDER', 'MISSING_ZEBRA', 'DAMAGED_SIGNAGE'].includes(e.type)) {
        counts[e.type] = (counts[e.type] || 0) + 1;
      }
    });

    const keys = Object.keys(counts);
    const labels = keys.map(k => LABEL_MAP[k] || k);
    const values = Object.values(counts);
    const colors = ['#F97316', '#FB923C', '#0EA5E9', '#DC2626', '#06B6D4', '#8B5CF6', '#D946EF'];

    return {
      labels: labels.length > 0 ? labels : ['Potholes', 'Road Cracks', 'Waterlogging', 'Damaged Road', 'Missing Dividers'],
      datasets: [{
        data: values.length > 0 ? values : [26, 20, 8, 14, 6],
        backgroundColor: colors.slice(0, Math.max(labels.length, 5)).map(c => c + '40'),
        borderColor: colors.slice(0, Math.max(labels.length, 5)),
        borderWidth: 2,
        hoverOffset: 6,
      }],
    };
  }, [events]);

  return (
    <div className="chart-container" style={{ height: 230, position: 'relative' }}>
      <Doughnut
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            ...basePlugins,
            legend: {
              ...basePlugins.legend,
              position: 'bottom',
              labels: {
                ...basePlugins.legend.labels,
                boxWidth: 10,
                padding: 8,
                font: { size: 10 },
              },
            },
          },
        }}
      />
    </div>
  );
}

export function VehicleDensityChart({ events }) {
  const data = useMemo(() => {
    const countEvents = events.filter(e => e.type === 'VEHICLE_COUNT' && e.vehicleCounts).slice(0, 8);
    
    if (countEvents.length === 0) {
      return {
        labels: ['Cars', 'Two-Wheelers', 'Autos', 'Trucks', 'Buses', 'Bicycles'],
        datasets: [{
          label: 'Vehicle Count',
          data: [180, 260, 95, 42, 24, 28],
          backgroundColor: [
            'rgba(0, 229, 255, 0.5)',
            'rgba(249, 115, 22, 0.5)',
            'rgba(168, 85, 247, 0.5)',
            'rgba(234, 179, 8, 0.5)',
            'rgba(239, 68, 68, 0.5)',
            'rgba(34, 197, 94, 0.5)',
          ],
          borderColor: [
            '#00e5ff', '#F97316', '#A855F7', '#EAB308', '#EF4444', '#22C55E',
          ],
          borderWidth: 1,
          borderRadius: 6,
        }],
      };
    }

    const totals = { car: 0, two_wheeler: 0, auto: 0, truck: 0, bus: 0, bicycle: 0 };
    countEvents.forEach(e => {
      Object.keys(totals).forEach(k => {
        totals[k] += e.vehicleCounts[k] || 0;
      });
    });

    return {
      labels: ['Cars', 'Two-Wheelers', 'Autos', 'Trucks', 'Buses', 'Bicycles'],
      datasets: [{
        label: 'Vehicle Count',
        data: Object.values(totals),
        backgroundColor: [
          'rgba(0, 229, 255, 0.5)',
          'rgba(249, 115, 22, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(34, 197, 94, 0.5)',
        ],
        borderColor: ['#00e5ff', '#F97316', '#A855F7', '#EAB308', '#EF4444', '#22C55E'],
        borderWidth: 1,
        borderRadius: 6,
      }],
    };
  }, [events]);

  return (
    <div className="chart-container" style={{ height: 210 }}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: cartesianScales,
          plugins: {
            ...basePlugins,
            legend: { display: false },
          },
        }}
      />
    </div>
  );
}

export function CongestionTimeline({ events }) {
  const data = useMemo(() => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    const congestionLevels = [28, 65, 82, 58, 42, 38, 45, 52, 74, 88, 70, 48];
    const avgSpeeds = congestionLevels.map(c => Math.max(10, Math.round(55 - c * 0.45)));

    return {
      labels: hours,
      datasets: [
        {
          label: 'Congestion %',
          data: congestionLevels,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Avg Speed (km/h)',
          data: avgSpeeds,
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
          yAxisID: 'y1',
        },
      ],
    };
  }, [events]);

  return (
    <div className="chart-container" style={{ height: 220 }}>
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            ...basePlugins,
            legend: {
              ...basePlugins.legend,
              position: 'top',
              labels: {
                ...basePlugins.legend.labels,
                font: { size: 10 },
                padding: 6,
              },
            },
          },
          scales: {
            x: cartesianScales.x,
            y: {
              ...cartesianScales.y,
              position: 'left',
              min: 0,
              max: 100,
              ticks: { color: '#64748b', font: { size: 9 }, stepSize: 25 },
              title: { display: false },
            },
            y1: {
              ...cartesianScales.y,
              position: 'right',
              min: 0,
              max: 60,
              ticks: { color: '#00e5ff', font: { size: 9 }, stepSize: 15 },
              grid: { drawOnChartArea: false },
              title: { display: false },
            },
          },
        }}
      />
    </div>
  );
}

export function ViolationStats({ events }) {
  const data = useMemo(() => {
    const violations = events.filter(e => ['RED_LIGHT_VIOLATION', 'SPEED_VIOLATION', 'HELMET_VIOLATION', 'RASH_DRIVING'].includes(e.type));
    const counts = {
      'Red Light': violations.filter(e => e.type === 'RED_LIGHT_VIOLATION').length || 8,
      'Over-Speed': violations.filter(e => e.type === 'SPEED_VIOLATION').length || 15,
      'No Helmet': violations.filter(e => e.type === 'HELMET_VIOLATION').length || 22,
      'Rash Driving': violations.filter(e => e.type === 'RASH_DRIVING').length || 7,
    };

    return {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Violations',
        data: Object.values(counts),
        backgroundColor: [
          'rgba(220, 38, 38, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(239, 68, 68, 0.5)',
        ],
        borderColor: ['#DC2626', '#F59E0B', '#A855F7', '#EF4444'],
        borderWidth: 1,
        borderRadius: 6,
      }],
    };
  }, [events]);

  return (
    <div className="chart-container" style={{ height: 210 }}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: cartesianScales,
          plugins: {
            ...basePlugins,
            legend: { display: false },
          },
        }}
      />
    </div>
  );
}

export function EventTimelineChart({ events }) {
  const data = useMemo(() => {
    const categories = ['Road Defect', 'Traffic', 'Safety', 'Incident', 'Violation', 'Infrastructure'];
    const counts = categories.map(() => Math.floor(Math.random() * 30) + 10);

    return {
      labels: categories,
      datasets: [{
        data: counts,
        backgroundColor: [
          'rgba(249, 115, 22, 0.5)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(6, 182, 212, 0.5)',
        ],
        borderColor: ['#F97316', '#3B82F6', '#EAB308', '#EF4444', '#A855F7', '#06B6D4'],
        borderWidth: 2,
        hoverOffset: 6,
      }],
    };
  }, [events]);

  return (
    <div className="chart-container" style={{ height: 200 }}>
      <Doughnut
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            ...basePlugins,
            legend: {
              ...basePlugins.legend,
              position: 'bottom',
            },
          },
        }}
      />
    </div>
  );
}
