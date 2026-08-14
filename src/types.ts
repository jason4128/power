export type RoundingMode = 'exact' | 'round' | 'ceil' | 'floor';

export interface Resident {
  id: string;
  name: string;
  color: string; // Tailwind color or hex
  weight: number; // Public electricity allocation weight (default 1)
}

export type MeterInputMode = 'direct' | 'readings';

export interface SubMeter {
  id: string;
  name: string;
  inputMode: MeterInputMode;
  previousReading: number;
  currentReading: number;
  directKwh: number;
  assignedResidentIds: string[]; // IDs of residents sharing this meter
}

export interface BillConfig {
  title: string;
  year?: number;
  monthPeriod?: string;
  customNote?: string;
  totalAmount: number; // e.g. 2000
  totalKwh: number;    // e.g. 500
  roundingMode: RoundingMode;
  autoBalanceDifference: boolean; // Whether to auto-balance small rounding differences
}

export interface AcShareItem {
  meterId: string;
  meterName: string;
  meterTotalKwh: number;
  sharedResidentCount: number;
  residentKwh: number;
  residentCost: number;
}

export interface ResidentResult {
  residentId: string;
  residentName: string;
  residentColor: string;
  commonKwh: number;
  commonCost: number;
  acBreakdown: AcShareItem[];
  totalAcKwh: number;
  totalAcCost: number;
  totalKwh: number;
  rawCost: number;      // Exact cost before rounding
  finalCost: number;    // Final rounded cost
  percentageOfTotal: number;
}

export interface CalculationResult {
  unitPrice: number;        // e.g. 4.00元/度
  totalAcKwh: number;       // e.g. 175度
  totalAcCost: number;      // e.g. 700元
  commonKwh: number;        // e.g. 325度
  commonCost: number;       // e.g. 1300元
  totalAllocatedCost: number; // Sum of final costs
  roundingVariance: number; // Difference between total bill and allocated cost
  residentResults: ResidentResult[];
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  periodName: string;
  config: BillConfig;
  residents: Resident[];
  subMeters: SubMeter[];
  result: CalculationResult;
}

export interface MasterSubMeterDef {
  id: string;
  name: string;
  assignedResidentIds: string[];
  inputMode?: MeterInputMode;
}

export interface HouseholdProfile {
  residents: Resident[];
  meters: MasterSubMeterDef[];
  updatedAt?: string;
}
