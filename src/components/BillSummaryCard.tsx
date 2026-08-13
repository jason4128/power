import React from 'react';
import { BillConfig, RoundingMode } from '../types';
import { Receipt, Calculator, Settings2, Calendar } from 'lucide-react';

interface BillSummaryCardProps {
  config: BillConfig;
  onChange: (updatedConfig: BillConfig) => void;
  onPeriodSwitch?: (newYear: number, newMonthPeriod: string, newNote: string) => void;
  unitPrice: number;
}

export const BillSummaryCard: React.FC<BillSummaryCardProps> = ({
  config,
  onChange,
  onPeriodSwitch,
  unitPrice,
}) => {
  const handleInputChange = (field: keyof BillConfig, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const currentYear = config.year || 2026;
  const currentMonthPeriod = config.monthPeriod || '12-1月';
  const currentCustomNote = config.customNote || '';

  const handleYearMonthUpdate = (year: number, monthPeriod: string, customNote: string) => {
    if (onPeriodSwitch && (year !== currentYear || monthPeriod !== currentMonthPeriod)) {
      onPeriodSwitch(year, monthPeriod, customNote);
    } else {
      const notePart = customNote.trim() ? ` (${customNote.trim()})` : '';
      const newTitle = `${year}年 ${monthPeriod} 電費帳單${notePart}`;
      onChange({
        ...config,
        year,
        monthPeriod,
        customNote,
        title: newTitle,
      });
    }
  };

  const yearsList = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">1. 台電帳單總資訊</h2>
            <p className="text-xs text-slate-500">選擇帳單年份與期別，並輸入總金額與總度數</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Bill Year & Month Direct Selector */}
        <div className="md:col-span-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>帳單計費年份與月份期別</span>
            </label>
            <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-3 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
              {config.title || `${currentYear}年 ${currentMonthPeriod} 電費帳單`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Year Selection */}
            <div>
              <label htmlFor="select-bill-year" className="block text-[11px] font-bold text-slate-600 mb-1">
                年份 (西元)
              </label>
              <select
                id="select-bill-year"
                value={currentYear}
                onChange={(e) =>
                  handleYearMonthUpdate(Number(e.target.value), currentMonthPeriod, currentCustomNote)
                }
                className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </div>

            {/* Month / Period Selection */}
            <div>
              <label htmlFor="select-bill-month" className="block text-[11px] font-bold text-slate-600 mb-1">
                計費月份 / 雙月期別
              </label>
              <select
                id="select-bill-month"
                value={currentMonthPeriod}
                onChange={(e) =>
                  handleYearMonthUpdate(currentYear, e.target.value, currentCustomNote)
                }
                className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <optgroup label="奇數雙月期別 (抄表月份 1,3,5,7,9,11月)">
                  <option value="12-1月">12-1 月帳單 (十二月~一月)</option>
                  <option value="1-3月">1-3 月帳單 (一月~三月)</option>
                  <option value="3-5月">3-5 月帳單 (三月~五月)</option>
                  <option value="5-7月">5-7 月帳單 (五月~七月)</option>
                  <option value="7-9月">7-9 月帳單 (七月~九月)</option>
                  <option value="9-11月">9-11 月帳單 (九月~十一月)</option>
                  <option value="11-1月">11-1 月帳單 (十一月~一月)</option>
                </optgroup>
                <optgroup label="偶數雙月期別 (抄表月份 2,4,6,8,10,12月)">
                  <option value="1-2月">1-2 月帳單 (一月~二月)</option>
                  <option value="3-4月">3-4 月帳單 (三月~四月)</option>
                  <option value="5-6月">5-6 月帳單 (五月~六月)</option>
                  <option value="7-8月">7-8 月帳單 (七月~八月)</option>
                  <option value="9-10月">9-10 月帳單 (九月~十月)</option>
                  <option value="11-12月">11-12 月帳單 (十一月~十二月)</option>
                </optgroup>
                <optgroup label="單月計費">
                  {Array.from({ length: 12 }, (_, i) => `${i + 1}月`).map((m) => (
                    <option key={m} value={m}>
                      {m} 帳單
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Optional Note */}
            <div>
              <label htmlFor="input-bill-note" className="block text-[11px] font-bold text-slate-600 mb-1">
                自訂備註 (選填)
              </label>
              <input
                id="input-bill-note"
                type="text"
                value={currentCustomNote}
                onChange={(e) =>
                  handleYearMonthUpdate(currentYear, currentMonthPeriod, e.target.value)
                }
                placeholder="例：租屋處 / 夏季"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Total Bill Amount */}
        <div>
          <label htmlFor="input-total-amount" className="block text-xs font-semibold text-slate-700 mb-1">
            帳單總金額 (NT$) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
              $
            </span>
            <input
              id="input-total-amount"
              type="number"
              min="0"
              step="1"
              value={config.totalAmount || ''}
              onChange={(e) =>
                handleInputChange('totalAmount', Math.max(0, Number(e.target.value)))
              }
              placeholder="例如：2000"
              className="w-full pl-8 pr-3.5 py-2.5 text-base font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors bg-white"
            />
          </div>
        </div>

        {/* Total kWh */}
        <div>
          <label htmlFor="input-total-kwh" className="block text-xs font-semibold text-slate-700 mb-1">
            帳單總用電度數 (度) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="input-total-kwh"
              type="number"
              min="0"
              step="1"
              value={config.totalKwh || ''}
              onChange={(e) =>
                handleInputChange('totalKwh', Math.max(0, Number(e.target.value)))
              }
              placeholder="例如：500"
              className="w-full pl-3.5 pr-8 py-2.5 text-base font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors bg-white"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
              度
            </span>
          </div>
        </div>

        {/* Calculated Unit Price Banner */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-center">
          <div className="text-xs text-amber-800 font-medium flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Calculator className="w-3.5 h-3.5 text-amber-600" />
              <span>平均每度電費</span>
            </span>
            <span className="text-[10px] text-amber-600/80">總金額 ÷ 總度數</span>
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-2xl font-extrabold text-amber-900">
              ${unitPrice.toFixed(2)}
            </span>
            <span className="text-xs text-amber-700 font-semibold">元 / 度</span>
          </div>
        </div>
      </div>

      {/* Advanced Settings Bar */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <Settings2 className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">計算微調選項：</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Rounding Mode */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">進位模式:</span>
            <select
              id="select-rounding-mode"
              value={config.roundingMode}
              onChange={(e) =>
                handleInputChange('roundingMode', e.target.value as RoundingMode)
              }
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-xs focus:ring-1 focus:ring-amber-500"
            >
              <option value="round">四捨五入至整數 ($433 - 預設)</option>
              <option value="exact">精確至小數點後 2 位 ($433.33)</option>
              <option value="ceil">無條件進位整數 ($434)</option>
              <option value="floor">無條件捨去整數 ($433)</option>
            </select>
          </div>

          {/* Auto Balance Switch */}
          {config.roundingMode !== 'exact' && (
            <label className="inline-flex items-center space-x-1.5 cursor-pointer text-slate-700 bg-amber-50/50 px-2 py-1 rounded-lg border border-amber-200/60">
              <input
                type="checkbox"
                checked={config.autoBalanceDifference}
                onChange={(e) =>
                  handleInputChange('autoBalanceDifference', e.target.checked)
                }
                className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <span className="text-xs font-medium text-amber-900">
                自動吸收四捨五入尾差
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
