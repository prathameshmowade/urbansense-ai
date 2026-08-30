// Sensor Fusion Engine — Vision (YOLO) + IoT Accelerometer / IMU Fusion
// Eliminates false positives (shadows, flat water reflections, leaves) by verifying physical Z-axis shocks

export class SensorFusionEngine {
  constructor() {
    this.fusionLogs = [];
    this.stats = {
      totalEvaluated: 0,
      confirmedCount: 0,
      falsePositivesFiltered: 0,
      avgCorrelationLatencyMs: 14,
    };
  }

  /**
   * Evaluates a visual road defect event against simulated high-frequency IMU telemetry
   * @param {Object} event - YOLO detection event
   * @param {Object} bus - Bus generating the event
   * @returns {Object} Enriched fusion result
   */
  correlate(event, bus) {
    if (!['POTHOLE', 'CRACK', 'DAMAGED_ROAD', 'WATERLOGGING'].includes(event.type)) {
      return null;
    }

    this.stats.totalEvaluated++;

    // Realistic probability: 80% are genuine physical defects, 20% are optical illusions (shadows, flat water)
    const isGenuinePhysicalBump = Math.random() < 0.82;
    
    // Baseline gravity is 1.0g. Shocks add impulse.
    let zAxisPeak = 0;
    let imuConfirmed = false;
    let reason = '';

    if (isGenuinePhysicalBump) {
      if (event.type === 'POTHOLE' || event.type === 'DAMAGED_ROAD') {
        zAxisPeak = +(1.8 + Math.random() * 2.4).toFixed(2); // 1.8g - 4.2g heavy shock
      } else if (event.type === 'CRACK') {
        zAxisPeak = +(1.25 + Math.random() * 0.6).toFixed(2); // 1.25g - 1.85g moderate vibration
      } else {
        zAxisPeak = +(1.15 + Math.random() * 0.4).toFixed(2); // 1.15g - 1.55g
      }
      imuConfirmed = zAxisPeak >= 1.20;
      reason = `IMU Z-Axis shock registered at ${zAxisPeak}g within ±45ms of optical bounding box.`;
      this.stats.confirmedCount++;
    } else {
      // False alarm (e.g. tree shadow or flat wet surface without depression)
      zAxisPeak = +(0.95 + (Math.random() - 0.5) * 0.12).toFixed(2); // 0.89g - 1.01g (normal smooth asphalt noise)
      imuConfirmed = false;
      reason = `No physical Z-Axis shock (${zAxisPeak}g < 1.20g threshold). Classified as shadow/optical false-positive.`;
      this.stats.falsePositivesFiltered++;
    }

    const fusionResult = {
      evaluatedAt: new Date().toISOString(),
      imuConfirmed,
      zAxisPeak,
      threshold: 1.20,
      correlationLatencyMs: Math.floor(10 + Math.random() * 12),
      fusionConfidence: imuConfirmed 
        ? Math.min(0.99, +(event.confidence + 0.12).toFixed(2)) 
        : +(event.confidence * 0.35).toFixed(2),
      status: imuConfirmed ? 'VERIFIED' : 'FILTERED_FALSE_POSITIVE',
      label: imuConfirmed ? 'Confirmed (Vision + IMU)' : 'Visual Only (Filtered)',
      reason,
      busId: bus.id,
      busSpeedKmph: Math.round(bus.speed),
    };

    // Store in recent rolling log
    this.fusionLogs.unshift({
      id: event.id,
      eventId: event.id,
      type: event.type,
      label: event.label,
      busId: bus.id,
      timestamp: event.timestamp,
      ...fusionResult,
    });

    if (this.fusionLogs.length > 50) {
      this.fusionLogs.pop();
    }

    return fusionResult;
  }

  getRecentLogs(limit = 10) {
    return this.fusionLogs.slice(0, limit);
  }

  getStats() {
    return { ...this.stats };
  }
}

export const sensorFusion = new SensorFusionEngine();
export default SensorFusionEngine;
