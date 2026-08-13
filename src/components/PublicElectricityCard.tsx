import React from 'react';
import { CalculationResult, Resident } from '../types';
import { Building2, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PublicElectricityCardProps {
  result: CalculationResult;
  totalBillKwh: number;
  totalBillAmount: number;
  residents: Resident[];
}

export const PublicElectricityCard: React.FC<PublicElectricityCardProps> = ({
  result,
  totalBillKwh,
  totalBillAmount,
  residents,
}) => {
  const isOverLimit = result.totalAcKwh > totalBillKwh;
  const commonPerPersonKwh =
    residents.length > 0 ? result.commonKwh / residents.length : 0;
  const commonPerPersonCost =
    residents.length > 0 ? result.commonCost / residents.length : 0;

  const acRatio =
    totalBillKwh > 0 ? Math.min(100, (result.totalAcKwh / totalBillKwh) * 100) : 0;
  const commonRatio = 100 - acRatio;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">4. 公用與基礎電費平攤計算</h2>
            <p className="text-xs text-slate-500">
              扣除全戶獨立冷氣後，剩餘的公共用電由全員平等均攤
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100/70 text-purple-800 border border-purple-200">
          全戶 {residents.length} 人均攤
        </span>
      </div>

      {isOverLimit ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-xs mb-4">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">冷氣抄表總度數已超出帳單總度數！</p>
            <p className="mt-1 text-rose-700">
              各獨立冷氣電表總和為 <strong className="font-bold">{result.totalAcKwh} 度</strong>，已大於帳單總度數{' '}
              <strong className="font-bold">{totalBillKwh} 度</strong>。請檢查前期與本期抄表數字或直接輸入的度數是否有誤。
            </p>
          </div>
        </div>
      ) : null}

      {/* Formula Step Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-0.5">帳單總用電</span>
          <span className="text-lg font-bold text-slate-800">{totalBillKwh} 度</span>
        </div>

        <div className="p-3.5 bg-cyan-50/60 rounded-xl border border-cyan-200/80 text-center">
          <span className="text-[11px] text-cyan-700 font-medium block mb-0.5">扣除冷氣總抄表</span>
          <span className="text-lg font-bold text-cyan-800">- {result.totalAcKwh.toFixed(1)} 度</span>
        </div>

        <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-center">
          <span className="text-[11px] text-purple-700 font-medium block mb-0.5">公用剩餘電費 (其他度數)</span>
          <span className="text-xl font-black text-purple-900">{result.commonKwh.toFixed(1)} 度</span>
          <span className="text-xs text-purple-700 block font-semibold">
            (${result.commonCost.toFixed(1)} 元)
          </span>
        </div>
      </div>

      {/* Per Person Breakdown Highlight */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <CheckCircle2 className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-100">
              公電平攤結論 (每位成員分配)
            </h3>
            <p className="text-xs text-purple-200/80 mt-0.5">
              公式：{result.commonKwh.toFixed(1)}度 ÷ {residents.length}位成員 × 每度${result.unitPrice.toFixed(2)}元
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
          <div className="text-xs text-purple-200">每人公電平攤：</div>
          <div className="text-xl font-black text-amber-300">
            {commonPerPersonKwh.toFixed(2)} 度
            <span className="text-sm font-semibold text-white ml-2">
              (${commonPerPersonCost.toFixed(2)}元)
            </span>
          </div>
        </div>
      </div>

      {/* Visual Usage Ratio Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
            <span>獨立冷氣總額 ({acRatio.toFixed(1)}%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
            <span>公用/其他基礎用電 ({commonRatio.toFixed(1)}%)</span>
          </span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${acRatio}%` }}
            title={`冷氣總用電 ${result.totalAcKwh} 度`}
          />
          <div
            className="h-full bg-purple-600 transition-all duration-500"
            style={{ width: `${commonRatio}%` }}
            title={`公用總用電 ${result.commonKwh} 度`}
          />
        </div>
      </div>
    </div>
  );
};
