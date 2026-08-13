import { BillConfig, Resident, SubMeter, CalculationResult, ResidentResult, AcShareItem } from '../types';

export function calculateSubMeterKwh(meter: SubMeter): number {
  if (meter.inputMode === 'direct') {
    return Math.max(0, meter.directKwh || 0);
  } else {
    const diff = (meter.currentReading || 0) - (meter.previousReading || 0);
    return Math.max(0, diff);
  }
}

export function calculateBill(
  config: BillConfig,
  residents: Resident[],
  subMeters: SubMeter[]
): CalculationResult {
  const { totalAmount, totalKwh, roundingMode, autoBalanceDifference } = config;

  // Calculate unit price per kWh
  const unitPrice = totalKwh > 0 ? totalAmount / totalKwh : 0;

  // Calculate each sub-meter's consumption
  const meterKwhMap: Record<string, number> = {};
  let totalAcKwh = 0;

  subMeters.forEach((meter) => {
    const kwh = calculateSubMeterKwh(meter);
    meterKwhMap[meter.id] = kwh;
    totalAcKwh += kwh;
  });

  const totalAcCost = totalAcKwh * unitPrice;

  // Calculate common / public electricity
  const commonKwh = Math.max(0, totalKwh - totalAcKwh);
  const commonCost = commonKwh * unitPrice;

  // Total resident weight for public electricity
  const totalResidentWeight = residents.reduce(
    (sum, r) => sum + Math.max(0, r.weight || 1),
    0
  );

  // Initialize resident result structure
  const rawResults: ResidentResult[] = residents.map((resident) => {
    const rWeight = Math.max(0, resident.weight || 1);
    const weightRatio = totalResidentWeight > 0 ? rWeight / totalResidentWeight : 0;

    // Public electricity share for this resident
    const rCommonKwh = commonKwh * weightRatio;
    const rCommonCost = commonCost * weightRatio;

    // AC shares for this resident
    const acBreakdown: AcShareItem[] = [];
    let rAcKwhSum = 0;
    let rAcCostSum = 0;

    subMeters.forEach((meter) => {
      if (meter.assignedResidentIds.includes(resident.id)) {
        const assignedCount = meter.assignedResidentIds.length;
        if (assignedCount > 0) {
          const meterKwh = meterKwhMap[meter.id] || 0;
          const residentMeterKwh = meterKwh / assignedCount;
          const residentMeterCost = residentMeterKwh * unitPrice;

          acBreakdown.push({
            meterId: meter.id,
            meterName: meter.name,
            meterTotalKwh: meterKwh,
            sharedResidentCount: assignedCount,
            residentKwh: residentMeterKwh,
            residentCost: residentMeterCost,
          });

          rAcKwhSum += residentMeterKwh;
          rAcCostSum += residentMeterCost;
        }
      }
    });

    const rTotalKwh = rCommonKwh + rAcKwhSum;
    const rawCost = rCommonCost + rAcCostSum;

    return {
      residentId: resident.id,
      residentName: resident.name,
      residentColor: resident.color,
      commonKwh: rCommonKwh,
      commonCost: rCommonCost,
      acBreakdown,
      totalAcKwh: rAcKwhSum,
      totalAcCost: rAcCostSum,
      totalKwh: rTotalKwh,
      rawCost: rawCost,
      finalCost: rawCost, // Will be rounded below
      percentageOfTotal: totalAmount > 0 ? (rawCost / totalAmount) * 100 : 0,
    };
  });

  // Apply rounding mode
  rawResults.forEach((r) => {
    switch (roundingMode) {
      case 'exact':
        r.finalCost = Math.round(r.rawCost * 100) / 100; // 2 decimal places
        break;
      case 'ceil':
        r.finalCost = Math.ceil(r.rawCost);
        break;
      case 'floor':
        r.finalCost = Math.floor(r.rawCost);
        break;
      case 'round':
      default:
        r.finalCost = Math.round(r.rawCost);
        break;
    }
  });

  // Calculate sum of rounded costs
  let totalAllocatedCost = rawResults.reduce((sum, r) => sum + r.finalCost, 0);
  let roundingVariance = totalAmount - totalAllocatedCost;

  // If auto-balance is enabled and there is an integer rounding variance
  if (
    autoBalanceDifference &&
    roundingMode !== 'exact' &&
    Math.abs(roundingVariance) > 0 &&
    rawResults.length > 0
  ) {
    // Sort residents by highest kWh or highest remainder to adjust 1-2 dollars fairly
    const sorted = [...rawResults].sort((a, b) => b.totalKwh - a.totalKwh);
    const diffToAdjust = Math.round(roundingVariance);

    if (diffToAdjust !== 0) {
      // Add diffToAdjust to the highest consumer
      const target = sorted[0];
      target.finalCost += diffToAdjust;
      totalAllocatedCost += diffToAdjust;
      roundingVariance = totalAmount - totalAllocatedCost;
    }
  }

  return {
    unitPrice,
    totalAcKwh,
    totalAcCost,
    commonKwh,
    commonCost,
    totalAllocatedCost,
    roundingVariance,
    residentResults: rawResults,
  };
}

/**
 * Generates formatted LINE / message text summary for easy copy-pasting
 */
export function generateLineTextSummary(
  config: BillConfig,
  result: CalculationResult
): string {
  const formatCurrency = (val: number) =>
    config.roundingMode === 'exact'
      ? `$${val.toFixed(2)}`
      : `$${Math.round(val)}`;

  const lines: string[] = [];
  lines.push(`⚡ 【${config.title || '本期電費分攤明細'}】`);
  lines.push(`---------------------------------`);
  lines.push(`🧾 帳單總金額：$${config.totalAmount.toLocaleString()} 元`);
  lines.push(`📊 帳單總度數：${config.totalKwh} 度`);
  lines.push(`💡 平均每度電：$${result.unitPrice.toFixed(2)} 元/度`);
  lines.push(
    `🏢 公用/基礎電費：${result.commonKwh.toFixed(1)} 度 ($${result.commonCost.toFixed(2)})`
  );
  lines.push(`---------------------------------`);

  result.residentResults.forEach((res) => {
    lines.push(`👤 【${res.residentName}】 應繳總額：${formatCurrency(res.finalCost)} 元`);
    lines.push(`  - 個人總用電：${res.totalKwh.toFixed(1)} 度`);
    lines.push(
      `  - 公電分攤：${res.commonKwh.toFixed(1)} 度 (${formatCurrency(res.commonCost)})`
    );

    if (res.acBreakdown.length > 0) {
      res.acBreakdown.forEach((ac) => {
        const shareNote =
          ac.sharedResidentCount > 1 ? ` (${ac.sharedResidentCount}人均攤)` : '';
        lines.push(
          `  - ${ac.meterName}${shareNote}：${ac.residentKwh.toFixed(1)}度 (${formatCurrency(ac.residentCost)})`
        );
      });
    } else {
      lines.push(`  - 獨立冷氣：無使用或未配置`);
    }
    lines.push('');
  });

  lines.push(`---------------------------------`);
  lines.push(`✅ 應繳金額總計核對：$${result.totalAllocatedCost.toLocaleString()} 元`);
  if (Math.abs(result.roundingVariance) > 0.01) {
    lines.push(`⚠️ 四捨五入微調差額：$${result.roundingVariance.toFixed(2)} 元`);
  }
  lines.push(`📅 計算時間：${new Date().toLocaleDateString('zh-TW')} ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`);

  return lines.join('\n');
}

/**
 * User Example Preset Data (matches prompt exactly)
 */
export function getPromptExampleData(): {
  config: BillConfig;
  residents: Resident[];
  subMeters: SubMeter[];
} {
  const residents: Resident[] = [
    { id: 'res-a', name: '成員 A', color: '#3b82f6', weight: 1 },
    { id: 'res-b', name: '成員 B', color: '#10b981', weight: 1 },
    { id: 'res-c', name: '成員 C', color: '#f59e0b', weight: 1 },
  ];

  const subMeters: SubMeter[] = [
    {
      id: 'meter-1',
      name: '冷氣 1 (A & B 共有)',
      inputMode: 'readings',
      previousReading: 1000,
      currentReading: 1100,
      directKwh: 100,
      assignedResidentIds: ['res-a', 'res-b'],
    },
    {
      id: 'meter-2',
      name: '冷氣 2 (C 專用)',
      inputMode: 'readings',
      previousReading: 500,
      currentReading: 550,
      directKwh: 50,
      assignedResidentIds: ['res-c'],
    },
    {
      id: 'meter-3',
      name: '冷氣 3 (C 專用)',
      inputMode: 'readings',
      previousReading: 200,
      currentReading: 225,
      directKwh: 25,
      assignedResidentIds: ['res-c'],
    },
  ];

  const config: BillConfig = {
    title: '2026年 12-1月 電費帳單',
    year: 2026,
    monthPeriod: '12-1月',
    customNote: '',
    totalAmount: 2000,
    totalKwh: 500,
    roundingMode: 'round',
    autoBalanceDifference: true,
  };

  return { config, residents, subMeters };
}
