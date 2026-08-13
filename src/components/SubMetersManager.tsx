import React from 'react';
import { SubMeter, Resident, MeterInputMode } from '../types';
import { calculateSubMeterKwh } from '../utils/calculator';
import { Gauge, Plus, Trash2, Check, UserCheck, ArrowRight } from 'lucide-react';

interface SubMetersManagerProps {
  subMeters: SubMeter[];
  residents: Resident[];
  onChange: (updatedSubMeters: SubMeter[]) => void;
  unitPrice: number;
}

export const SubMetersManager: React.FC<SubMetersManagerProps> = ({
  subMeters,
  residents,
  onChange,
  unitPrice,
}) => {
  const handleAddMeter = () => {
    const nextIndex = subMeters.length + 1;
    const newMeter: SubMeter = {
      id: `meter-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `冷氣 ${nextIndex}`,
      inputMode: 'readings',
      previousReading: 0,
      currentReading: 0,
      directKwh: 0,
      assignedResidentIds: residents.length > 0 ? [residents[0].id] : [],
    };
    onChange([...subMeters, newMeter]);
  };

  const handleUpdateMeter = (id: string, field: keyof SubMeter, value: any) => {
    const updated = subMeters.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange(updated);
  };

  const handleRemoveMeter = (id: string) => {
    const updated = subMeters.filter((m) => m.id !== id);
    onChange(updated);
  };

  const toggleResidentAssignment = (meterId: string, residentId: string) => {
    const updated = subMeters.map((meter) => {
      if (meter.id !== meterId) return meter;
      const exists = meter.assignedResidentIds.includes(residentId);
      const newAssigned = exists
        ? meter.assignedResidentIds.filter((id) => id !== residentId)
        : [...meter.assignedResidentIds, residentId];
      return { ...meter, assignedResidentIds: newAssigned };
    });
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">3. 獨立分電表 / 冷氣抄表</h2>
            <p className="text-xs text-slate-500">
              設定各房間冷氣分電表度數，並指定負擔責任成員
            </p>
          </div>
        </div>

        <button
          onClick={handleAddMeter}
          id="btn-add-meter"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/60 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新增獨立電表</span>
        </button>
      </div>

      {subMeters.length === 0 ? (
        <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Gauge className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs">目前無獨立電表，若有裝設獨立冷氣電表請點選「新增獨立電表」</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subMeters.map((meter) => {
            const kwh = calculateSubMeterKwh(meter);
            const cost = kwh * unitPrice;
            const assignedCount = meter.assignedResidentIds.length;
            const perPersonKwh = assignedCount > 0 ? kwh / assignedCount : 0;
            const perPersonCost = assignedCount > 0 ? cost / assignedCount : 0;

            return (
              <div
                key={meter.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                  {/* Meter Name & Badge */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={meter.name}
                      onChange={(e) =>
                        handleUpdateMeter(meter.id, 'name', e.target.value)
                      }
                      className="text-sm font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 w-52"
                      placeholder="例：冷氣 1 (房間A)"
                    />
                    <span className="text-xs px-2.5 py-1 rounded-md bg-cyan-100/70 text-cyan-800 font-medium">
                      抄表減扣模式
                    </span>
                  </div>

                  {/* Summary badge */}
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="px-3 py-1 bg-cyan-100/60 text-cyan-900 font-bold rounded-lg border border-cyan-200/60 flex items-center space-x-1">
                      <span>{meter.name} 用電：</span>
                      <span className="text-sm text-cyan-700">{kwh.toFixed(1)} 度</span>
                      <span className="text-slate-400 font-normal">
                        (${cost.toFixed(1)}元)
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveMeter(meter.id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer flex items-center space-x-1"
                      title="刪除此冷氣電表"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-semibold text-rose-600 hidden sm:inline">刪除冷氣</span>
                    </button>
                  </div>
                </div>

                {/* Meter Reading Inputs (Previous & Current Reading Subtraction) */}
                <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      前期抄表度數 (上次數字)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={meter.previousReading === 0 ? '0' : meter.previousReading || ''}
                      onChange={(e) =>
                        handleUpdateMeter(
                          meter.id,
                          'previousReading',
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      placeholder="例如：1000"
                      className="w-full px-3 py-2 font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      本期抄表度數 (本次數字)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={meter.currentReading === 0 ? '0' : meter.currentReading || ''}
                      onChange={(e) =>
                        handleUpdateMeter(
                          meter.id,
                          'currentReading',
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      placeholder="例如：1100"
                      className="w-full px-3 py-2 font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1 text-slate-600 font-medium">
                    <div className="bg-cyan-50/80 border border-cyan-100 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-xs text-slate-600">抄表減扣用電：</span>
                      <div className="text-right">
                        <span className="text-cyan-800 font-extrabold text-sm">
                          {kwh.toFixed(1)} 度
                        </span>
                        {meter.currentReading < meter.previousReading && (
                          <div className="text-[10px] text-rose-500 font-normal">
                            ⚠️ 本期小於前期
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responsible Residents Selector */}
                <div className="pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-600">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                    <span className="font-semibold text-slate-700">選擇共同負擔成員：</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {residents.map((resident) => {
                      const isSelected = meter.assignedResidentIds.includes(
                        resident.id
                      );
                      return (
                        <button
                          key={resident.id}
                          onClick={() =>
                            toggleResidentAssignment(meter.id, resident.id)
                          }
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40"
                            style={{ backgroundColor: resident.color }}
                          />
                          <span>{resident.name}</span>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allocation Note */}
                {assignedCount > 0 && (
                  <div className="mt-2 text-[11px] text-slate-500 bg-white/80 px-2.5 py-1 rounded border border-slate-100 flex items-center justify-between">
                    <span>
                      由 {meter.assignedResidentIds
                        .map((id) => residents.find((r) => r.id === id)?.name)
                        .filter(Boolean)
                        .join(' 與 ')}{' '}
                      共 {assignedCount} 人分攤
                    </span>
                    <span className="font-semibold text-slate-700">
                      每人分攤：{perPersonKwh.toFixed(1)} 度 (${perPersonCost.toFixed(2)}元)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
