import React from 'react';
import { CalculationResult, BillConfig } from '../types';
import { DollarSign, PieChart, Sparkles, Share2, Info, ArrowUpRight } from 'lucide-react';

interface ResultsBreakdownProps {
  result: CalculationResult;
  config: BillConfig;
  onOpenShare: () => void;
}

export const ResultsBreakdown: React.FC<ResultsBreakdownProps> = ({
  result,
  config,
  onOpenShare,
}) => {
  const formatMoney = (val: number) => {
    if (config.roundingMode === 'exact') {
      return `$${val.toFixed(2)}`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6">
      <div id="tour-step-results" className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">5. 個人應繳費用分攤結果</h2>
            <p className="text-xs text-slate-500">成員各自冷氣度數與公電平攤金額試算結果</p>
          </div>
        </div>

        <button
          onClick={onOpenShare}
          id="btn-open-share-modal"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Share2 className="w-4 h-4" />
          <span>複製 LINE 請款通知</span>
        </button>
      </div>

      {/* Summary Verification Pill */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-1">
              {config.title || '本期帳單分攤試算'}
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-amber-400">
                ${result.totalAllocatedCost.toLocaleString()} 元
              </span>
              <span className="text-xs text-slate-300">
                (全戶應收總合 / 帳單原額 ${config.totalAmount.toLocaleString()})
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l border-slate-700/80 pt-3 md:pt-0 md:pl-5 text-xs text-slate-300">
            <div>
              <div className="text-slate-400 text-[11px]">全戶冷氣總額</div>
              <div className="font-bold text-cyan-300 mt-0.5">
                {result.totalAcKwh.toFixed(1)} 度 (${result.totalAcCost.toFixed(1)})
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">全戶公電總額</div>
              <div className="font-bold text-purple-300 mt-0.5">
                {result.commonKwh.toFixed(1)} 度 (${result.commonCost.toFixed(1)})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Proportion Comparison Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <span className="flex items-center space-x-1">
            <PieChart className="w-4 h-4 text-slate-400" />
            <span>各成員分攤金額比例視覺圖</span>
          </span>
          <span className="text-slate-400 text-[11px]">總計 100%</span>
        </div>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {result.residentResults.map((r) => (
            <div
              key={r.residentId}
              style={{
                width: `${r.percentageOfTotal}%`,
                backgroundColor: r.residentColor,
              }}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:opacity-90 relative group"
              title={`${r.residentName}: ${formatMoney(r.finalCost)} (${r.percentageOfTotal.toFixed(1)}%)`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
          {result.residentResults.map((r) => (
            <div key={r.residentId} className="flex items-center space-x-1.5">
              <span
                className="w-3 h-3 rounded-full border border-slate-200"
                style={{ backgroundColor: r.residentColor }}
              />
              <span className="font-bold text-slate-700">{r.residentName}:</span>
              <span className="font-medium text-slate-600">
                {formatMoney(r.finalCost)} ({r.percentageOfTotal.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Resident Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {result.residentResults.map((res) => (
          <div
            key={res.residentId}
            className="rounded-2xl border-2 transition-all duration-200 overflow-hidden bg-white shadow-xs hover:shadow-md flex flex-col justify-between"
            style={{ borderColor: `${res.residentColor}40` }}
          >
            {/* Resident Card Header */}
            <div>
              <div
                className="px-4 py-3 text-white flex items-center justify-between"
                style={{ backgroundColor: res.residentColor }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs text-white border border-white/30">
                    {res.residentName.charAt(0) || '住'}
                  </div>
                  <h3 className="font-bold text-base tracking-wide">
                    {res.residentName}
                  </h3>
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
                  {res.percentageOfTotal.toFixed(1)}%
                </span>
              </div>

              {/* Amount Display */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">
                  個人應繳總金額
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black text-slate-900">
                    {formatMoney(res.finalCost)}
                  </span>
                  <span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    總計 {res.totalKwh.toFixed(1)} 度
                  </span>
                </div>
              </div>

              {/* Itemized Breakdown Details */}
              <div className="p-4 space-y-2.5 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  費用組成明細
                </div>

                {/* Common Electricity */}
                <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-purple-900 block">公用電費分攤</span>
                    <span className="text-[10px] text-purple-600">
                      {res.commonKwh.toFixed(1)} 度 × ${result.unitPrice.toFixed(2)}元
                    </span>
                  </div>
                  <span className="font-bold text-purple-900">
                    {formatMoney(res.commonCost)}
                  </span>
                </div>

                {/* Individual AC Breakdown */}
                {res.acBreakdown.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-400 text-center">
                    獨立冷氣：無分攤
                  </div>
                ) : (
                  res.acBreakdown.map((ac) => (
                    <div
                      key={ac.meterId}
                      className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-cyan-950 flex items-center space-x-1">
                          <span>{ac.meterName}</span>
                          {ac.sharedResidentCount > 1 && (
                            <span className="text-[10px] bg-cyan-200/60 text-cyan-800 px-1.5 py-0.2 rounded font-semibold">
                              {ac.sharedResidentCount}人均攤
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-cyan-700">
                          {ac.residentKwh.toFixed(1)} 度 × ${result.unitPrice.toFixed(2)}元
                        </span>
                      </div>
                      <span className="font-bold text-cyan-950">
                        {formatMoney(ac.residentCost)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom summary footer */}
            <div className="px-4 py-2.5 bg-slate-100/70 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between items-center">
              <span>平均單價 ${result.unitPrice.toFixed(2)}元/度</span>
              <span className="font-semibold text-slate-700">核對完成 ✅</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
