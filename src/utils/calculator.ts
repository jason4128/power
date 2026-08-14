import { BillConfig, Resident, SubMeter, CalculationResult, ResidentResult } from '../types';

export function getPromptExampleData() {
  return {
    config: {
      title: '2026年 1-3月 電費帳單',
      year: 2026,
      monthPeriod: '1-3月',
      totalAmount: 2000,
      totalKwh: 500,
      roundingMode: 'round',
      autoBalanceDifference: true,
    } as BillConfig,
    residents: [
      { id: 'res-1', name: '涵', color: '#3b82f6', weight: 1 },
      { id: 'res-2', name: '宏', color: '#10b981', weight: 1 },
      { id: 'res-3', name: '濰', color: '#f59e0b', weight: 1 },
    ] as Resident[],
    subMeters: [
      {
        id: 'meter-1',
        name: '客廳冷氣(涵 & 宏 共有)',
        inputMode: 'readings',
        previousReading: 100,
        currentReading: 200,
        directKwh: 0,
        assignedResidentIds: ['res-1', 'res-2'],
      },
      {
        id: 'meter-2',
        name: '房間冷氣(涵 & 宏 共有)',
        inputMode: 'readings',
        previousReading: 50,
        currentReading: 231,
        directKwh: 0,
        assignedResidentIds: ['res-1', 'res-2'],
      },
      {
        id: 'meter-3',
        name: '客廳冷氣(濰)',
        inputMode: 'readings',
        previousReading: 0,
        currentReading: 95,
        directKwh: 0,
        assignedResidentIds: ['res-3'],
      },
    ] as SubMeter[],
  };
}

export function calculateBill(config: BillConfig, residents: Resident[], subMeters: SubMeter[]): CalculationResult {
  const { totalAmount, totalKwh, roundingMode, autoBalanceDifference } = config;

  if (totalKwh <= 0 || totalAmount <= 0) {
    return createEmptyResult(residents);
  }

  const unitPrice = totalAmount / totalKwh;

  let totalAcKwh = 0;
  let totalAcCost = 0;
  
  // Create resident map
  const residentMap = new Map<string, ResidentResult>();
  let totalWeight = 0;
  for (const r of residents) {
    totalWeight += r.weight;
    residentMap.set(r.id, {
      residentId: r.id,
      residentName: r.name,
      residentColor: r.color,
      commonKwh: 0,
      commonCost: 0,
      acBreakdown: [],
      totalAcKwh: 0,
      totalAcCost: 0,
      totalKwh: 0,
      rawCost: 0,
      finalCost: 0,
      percentageOfTotal: 0,
    });
  }

  // Calculate ACs
  for (const m of subMeters) {
    const kwh = m.inputMode === 'readings' ? Math.max(0, m.currentReading - m.previousReading) : m.directKwh;
    if (kwh <= 0) continue;
    
    totalAcKwh += kwh;
    const cost = kwh * unitPrice;
    totalAcCost += cost;

    // Distribute among assigned residents
    const assignedCount = m.assignedResidentIds.length;
    if (assignedCount > 0) {
      const shareKwh = kwh / assignedCount;
      const shareCost = cost / assignedCount;
      for (const rid of m.assignedResidentIds) {
        const rr = residentMap.get(rid);
        if (rr) {
          rr.acBreakdown.push({
            meterId: m.id,
            meterName: m.name,
            meterTotalKwh: kwh,
            sharedResidentCount: assignedCount,
            residentKwh: shareKwh,
            residentCost: shareCost
          });
          rr.totalAcKwh += shareKwh;
          rr.totalAcCost += shareCost;
        }
      }
    }
  }

  const commonKwh = Math.max(0, totalKwh - totalAcKwh);
  const commonCost = Math.max(0, totalAmount - totalAcCost);
  
  // Distribute common
  let totalAllocatedCost = 0;
  const residentResults = Array.from(residentMap.values());
  for (const rr of residentResults) {
    const r = residents.find(res => res.id === rr.residentId);
    if (!r) continue;
    
    const weightFraction = totalWeight > 0 ? (r.weight / totalWeight) : 0;
    rr.commonKwh = commonKwh * weightFraction;
    rr.commonCost = commonCost * weightFraction;
    
    rr.totalKwh = rr.totalAcKwh + rr.commonKwh;
    rr.rawCost = rr.totalAcCost + rr.commonCost;
    
    if (roundingMode === 'round') {
      rr.finalCost = Math.round(rr.rawCost);
    } else if (roundingMode === 'ceil') {
      rr.finalCost = Math.ceil(rr.rawCost);
    } else if (roundingMode === 'floor') {
      rr.finalCost = Math.floor(rr.rawCost);
    } else {
      rr.finalCost = Number(rr.rawCost.toFixed(2));
    }
    
    totalAllocatedCost += rr.finalCost;
  }
  
  let roundingVariance = totalAmount - totalAllocatedCost;
  
  // autoBalanceDifference
  if (autoBalanceDifference && roundingMode !== 'exact' && Math.abs(roundingVariance) > 0 && Math.abs(roundingVariance) <= residentResults.length) {
    const diff = Math.round(roundingVariance);
    if (diff !== 0) {
      const sign = diff > 0 ? 1 : -1;
      const count = Math.abs(diff);
      
      const sorted = [...residentResults].sort((a, b) => {
         const fracA = a.rawCost - Math.floor(a.rawCost);
         const fracB = b.rawCost - Math.floor(b.rawCost);
         return sign > 0 ? fracB - fracA : fracA - fracB;
      });
      
      for(let i=0; i<count; i++) {
        if(i < sorted.length) {
           sorted[i].finalCost += sign;
           totalAllocatedCost += sign;
        }
      }
      roundingVariance = totalAmount - totalAllocatedCost;
    }
  }
  
  for(const rr of residentResults) {
    rr.percentageOfTotal = totalAmount > 0 ? (rr.finalCost / totalAmount) * 100 : 0;
  }

  return {
    unitPrice: Number(unitPrice.toFixed(4)),
    totalAcKwh,
    totalAcCost,
    commonKwh,
    commonCost,
    totalAllocatedCost,
    roundingVariance,
    residentResults
  };
}

function createEmptyResult(residents: Resident[]): CalculationResult {
  return {
    unitPrice: 0,
    totalAcKwh: 0,
    totalAcCost: 0,
    commonKwh: 0,
    commonCost: 0,
    totalAllocatedCost: 0,
    roundingVariance: 0,
    residentResults: residents.map(r => ({
      residentId: r.id,
      residentName: r.name,
      residentColor: r.color,
      commonKwh: 0,
      commonCost: 0,
      acBreakdown: [],
      totalAcKwh: 0,
      totalAcCost: 0,
      totalKwh: 0,
      rawCost: 0,
      finalCost: 0,
      percentageOfTotal: 0,
    }))
  };
}

export function calculateSubMeterKwh(meter: SubMeter): number {
  if (meter.inputMode === 'readings') {
    return Math.max(0, meter.currentReading - meter.previousReading);
  }
  return Math.max(0, meter.directKwh);
}

export function generateLineTextSummary(config: BillConfig, result: CalculationResult): string {
  let text = `⚡ ${config.title}\n`;
  text += `總金額: $${config.totalAmount} | 總用電: ${config.totalKwh}度\n`;
  text += `--------------------\n`;
  for (const rr of result.residentResults) {
    text += `👤 ${rr.residentName}: $${rr.finalCost} (${rr.totalKwh.toFixed(1)}度)\n`;
  }
  text += `--------------------\n`;
  text += `本期每度電費: $${result.unitPrice.toFixed(2)}`;
  return text;
}
