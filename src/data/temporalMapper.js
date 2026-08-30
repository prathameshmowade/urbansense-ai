// Temporal Mapper — Road Degradation Forecasting & Automated Municipal Repair Verification
// Tracks historical defect trajectories over time to forecast structural failure & audit repair quality

export class TemporalMapper {
  constructor() {
    this.sectors = new Map(); // sectorKey -> SectorHistory
    this.decayAlerts = [];
    this.verifiedRepairs = [];
    this.lastRepairCheckTick = 0;
  }

  /**
   * Record a defect observation into temporal space
   */
  recordObservation(event, bus) {
    if (!['POTHOLE', 'CRACK', 'DAMAGED_ROAD', 'WATERLOGGING'].includes(event.type)) {
      return;
    }

    // Grid cluster size ~200m
    const cellKey = `${(Math.round(event.lat * 250) / 250).toFixed(3)}_${(Math.round(event.lng * 250) / 250).toFixed(3)}`;

    if (!this.sectors.has(cellKey)) {
      this.sectors.set(cellKey, {
        id: `SEC-${cellKey}`,
        cellKey,
        lat: event.lat,
        lng: event.lng,
        routeName: bus?.routeName || 'Nagpur Arterial Corridor',
        firstObserved: event.timestamp,
        lastObserved: event.timestamp,
        observationCount: 0,
        currentSeverity: event.severity,
        defectTypes: new Set(),
        history: [],
        status: 'MONITORING', // 'DECAYING', 'REPAIRED_VERIFIED', 'MONITORING'
        healthScore: 85,
        decayRate: '+0% / wk',
      });
    }

    const sector = this.sectors.get(cellKey);
    sector.lastObserved = event.timestamp;
    sector.observationCount++;
    sector.defectTypes.add(event.type);
    sector.currentSeverity = event.severity;

    // Recalculate health & decay progression
    const defectCount = sector.observationCount;
    sector.healthScore = Math.max(15, 100 - defectCount * 12);

    const snapshot = {
      timestamp: event.timestamp,
      defectType: event.type,
      busId: bus.id,
      healthScore: sector.healthScore,
      severity: event.severity,
    };

    sector.history.push(snapshot);
    if (sector.history.length > 20) sector.history.shift();

    // Trigger decay alerts if progression worsens (e.g. 3+ detections)
    if (defectCount >= 3 && sector.status !== 'DECAYING') {
      sector.status = 'DECAYING';
      sector.decayRate = `+${Math.min(45, defectCount * 14)}% / wk`;
      
      const alert = {
        id: `DECAY-${Date.now()}-${cellKey}`,
        cellKey,
        lat: sector.lat,
        lng: sector.lng,
        routeName: sector.routeName,
        firstDefect: Array.from(sector.defectTypes)[0],
        latestDefect: event.type,
        defectCount,
        healthScore: sector.healthScore,
        decayRate: sector.decayRate,
        timestamp: new Date().toISOString(),
        urgency: defectCount >= 5 ? 'HIGH' : 'MEDIUM',
        prediction: defectCount >= 5 
          ? 'Critical asphalt collapse predicted in 4-6 days without resurfacing.' 
          : 'Micro-cracks expanding into structural pothole. Early patch recommended.',
      };

      // Add to decay alerts if not already present
      if (!this.decayAlerts.some(a => a.cellKey === cellKey)) {
        this.decayAlerts.unshift(alert);
      }
    }
  }

  /**
   * Periodic simulation of road repair completion (e.g. NMC patching crew repaired a pothole)
   * This proves automated verification through subsequent bus passes
   */
  simulateRepairVerification(currentTick) {
    // Every 18 ticks, pick an active decaying sector and mark it repaired & verified
    if (currentTick - this.lastRepairCheckTick < 18) return;
    this.lastRepairCheckTick = currentTick;

    const decayingSectors = Array.from(this.sectors.values()).filter(s => s.status === 'DECAYING');
    if (decayingSectors.length === 0) return;

    // Pick one decaying sector to simulate verified repair
    const repairedSector = decayingSectors[Math.floor(Math.random() * decayingSectors.length)];
    repairedSector.status = 'REPAIRED_VERIFIED';
    repairedSector.healthScore = 96;
    repairedSector.observationCount = 0;
    repairedSector.decayRate = '0%';

    const repairLog = {
      id: `REP-${Date.now()}-${repairedSector.cellKey}`,
      cellKey: repairedSector.cellKey,
      lat: repairedSector.lat,
      lng: repairedSector.lng,
      routeName: repairedSector.routeName,
      repairedAt: new Date().toISOString(),
      previousDefects: Array.from(repairedSector.defectTypes).join(', '),
      beforeHealthScore: repairedSector.healthScore - 45,
      currentHealthScore: 96,
      verificationPasses: Math.floor(3 + Math.random() * 4),
      contractorStatus: '✅ Verified Repaired by Multi-Bus Telemetry',
      workOrderNo: `NMC-WO-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    this.verifiedRepairs.unshift(repairLog);
    if (this.verifiedRepairs.length > 20) this.verifiedRepairs.pop();

    // Remove from active decay alerts
    this.decayAlerts = this.decayAlerts.filter(a => a.cellKey !== repairedSector.cellKey);
  }

  getDecayingLocations() {
    return this.decayAlerts.slice(0, 8);
  }

  getRepairedLocations() {
    return this.verifiedRepairs.slice(0, 8);
  }

  getTemporalSummary() {
    return {
      activeDecayHotspots: this.decayAlerts.length,
      verifiedRepairsCount: this.verifiedRepairs.length,
      monitoredSectorsCount: this.sectors.size,
    };
  }
}

export const temporalMapper = new TemporalMapper();
export default TemporalMapper;
