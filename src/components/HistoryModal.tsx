import React, { useState, useEffect } from 'react';
import { HistoryRecord, BillConfig, Resident, SubMeter, CalculationResult } from '../types';
import {
  saveBillToFirebase,
  deleteBillFromFirebase,
  subscribeToBillsFromFirebase,
} from '../lib/firebase';
import { generateLineTextSummary } from '../utils/calculator';
import {
  X,
  Save,
  Trash2,
  Calendar,
  ArrowRight,
  History,
  Check,
  Cloud,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Gauge,
  Users,
} from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: BillConfig;
  currentResidents: Resident[];
  currentSubMeters: SubMeter[];
  currentResult: CalculationResult;
  onLoadRecord: (config: BillConfig, residents: Resident[], subMeters: SubMeter[]) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  currentResidents,
  currentSubMeters,
  currentResult,
  onLoadRecord,
}) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const unsubscribe = subscribeToBillsFromFirebase((records, loading) => {
      setHistory(records);
      setIsLoading(loading);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCurrent = async () => {
    try {
      setIsSaving(true);
      const newRecord: HistoryRecord = {
        id: `bill-${Date.now()}`,
        createdAt: new Date().toISOString(),
        periodName: currentConfig.title || `${new Date().getFullYear()}年電費帳單`,
        config: currentConfig,
        residents: currentResidents,
        subMeters: currentSubMeters,
        result: currentResult,
      };

      await saveBillToFirebase(newRecord);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save to Firebase:', err);
      alert('儲存至 Firebase 失敗，請再試一次');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string, name: string) => {
    if (window.confirm(`確定要從 Firebase 刪除「${name}」這期紀錄嗎？`)) {
      try {
        await deleteBillFromFirebase(id);
      } catch (err) {
        console.error('Failed to delete from Firebase:', err);
        alert('刪除失敗，請重試');
      }
    }
  };

  const handleApplyNextPeriod = (record: HistoryRecord) => {
    // Inherit submeter current readings as new previous readings!
    const inheritedSubMeters = record.subMeters.map((meter) => {
      const lastKwhReading =
        meter.inputMode === 'readings'
          ? meter.currentReading
          : meter.previousReading + (meter.directKwh || 0);

      return {
        ...meter,
        inputMode: 'readings' as const,
        previousReading: lastKwhReading,
        currentReading: lastKwhReading, // user enters new current reading
        directKwh: 0,
      };
    });

    const newConfig: BillConfig = {
      ...record.config,
      title: `${new Date().getFullYear()}年 新抄表週期`,
    };

    onLoadRecord(newConfig, record.residents, inheritedSubMeters);
    onClose();
  };

  const handleCopyHistorySummary = (record: HistoryRecord) => {
    const text = generateLineTextSummary(record.config, record.result);
    navigator.clipboard.writeText(text);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">歷史電費帳單與抄表紀錄</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Cloud className="w-3 h-3" />
                  <span>Firebase 雲端同步</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">所有期別電費單自動永久備份，隨時查閱歷史與帶入抄表</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
          
          {/* Quick Save Box */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900">
                  當前編輯帳單：{currentConfig.title || '本期電費帳單'}
                </span>
                <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded font-semibold">
                  未儲存
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                總金額 <span className="font-bold text-slate-800">${currentConfig.totalAmount.toLocaleString()}元</span> • 用電度數 <span className="font-bold text-slate-800">{currentConfig.totalKwh}度</span> ({currentResidents.length}位成員 / {currentSubMeters.length}台冷氣)
              </p>
            </div>

            <button
              onClick={handleSaveCurrent}
              disabled={isSaving}
              id="btn-save-bill-firebase"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-xs disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>已成功儲存至 Firebase！</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? '儲存中...' : '儲存此期至 Firebase'}</span>
                </>
              )}
            </button>
          </div>

          {/* List Section Title */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>所有歷史期別紀錄 ({history.length} 期)</span>
            </span>
          </div>

          {/* Records List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">正在連線 Firebase 載入歷史資料...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">尚無 Firebase 歷史電費紀錄</p>
              <p className="text-xs text-slate-400 mt-1">請點選上方「儲存此期至 Firebase」按鈕，將本期帳單存檔至雲端</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => {
                const isExpanded = expandedRecordId === record.id;
                const dateStr = new Date(record.createdAt).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all overflow-hidden"
                  >
                    {/* Record Main Row */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-base text-slate-900">
                            {record.periodName || record.config?.title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {dateStr}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                            總金額：${record.config?.totalAmount?.toLocaleString()} 元
                          </span>
                          <span>總用電：{record.config?.totalKwh} 度</span>
                          <span>單價：${record.result?.unitPrice?.toFixed(2)} 元/度</span>
                          <span>冷氣：{record.subMeters?.length || 0} 台</span>
                          <span>成員：{record.residents?.length || 0} 人</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                        <button
                          onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center space-x-1 ${
                            isExpanded
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                          }`}
                          title="查看詳細各別分攤與抄表度數"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isExpanded ? '收起明細' : '檢視明細'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleApplyNextPeriod(record)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors cursor-pointer flex items-center space-x-1"
                          title="將此期抄表數字做為新一期的上次抄表數字"
                        >
                          <span>繼承至新抄表週期</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRecord(record.id, record.periodName)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="從 Firebase 刪除此期"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/80 border-t border-slate-200 text-xs space-y-4 animate-in slide-in-from-top-1 duration-150">
                        
                        {/* 1. Submeter Readings Breakdown Table */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <div className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                            <Gauge className="w-4 h-4 text-cyan-600" />
                            <span>冷氣抄表歷史數據 ({record.subMeters.length} 台)</span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                                  <th className="py-1.5 px-2 font-semibold">電表名稱</th>
                                  <th className="py-1.5 px-2 font-semibold">前期抄表</th>
                                  <th className="py-1.5 px-2 font-semibold">本期抄表</th>
                                  <th className="py-1.5 px-2 font-semibold">相減用電</th>
                                  <th className="py-1.5 px-2 font-semibold">小計金額</th>
                                  <th className="py-1.5 px-2 font-semibold">負擔成員</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {record.subMeters.map((meter) => {
                                  const diffKwh =
                                    meter.inputMode === 'readings'
                                      ? Math.max(0, (meter.currentReading || 0) - (meter.previousReading || 0))
                                      : meter.directKwh || 0;
                                  const cost = diffKwh * (record.result?.unitPrice || 0);
                                  const assignedNames = meter.assignedResidentIds
                                    .map((id) => record.residents.find((r) => r.id === id)?.name)
                                    .filter(Boolean)
                                    .join(', ');

                                  return (
                                    <tr key={meter.id} className="hover:bg-slate-50">
                                      <td className="py-1.5 px-2 font-bold text-slate-800">{meter.name}</td>
                                      <td className="py-1.5 px-2">{meter.previousReading} 度</td>
                                      <td className="py-1.5 px-2 font-medium">{meter.currentReading} 度</td>
                                      <td className="py-1.5 px-2 font-bold text-cyan-700">{diffKwh.toFixed(1)} 度</td>
                                      <td className="py-1.5 px-2 font-medium">${cost.toFixed(1)} 元</td>
                                      <td className="py-1.5 px-2 text-slate-500">{assignedNames || '無指定'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 2. Resident Result Breakdown */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <div className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <span>成員應繳總額結算記錄</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {record.result?.residentResults.map((res) => (
                              <div
                                key={res.residentId}
                                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                    <span className="font-bold text-slate-800 text-xs">
                                      {res.residentName}
                                    </span>
                                    <span className="font-extrabold text-sm text-emerald-700">
                                      ${Math.round(res.finalCost)} 元
                                    </span>
                                  </div>

                                  <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                                    <div className="flex justify-between">
                                      <span>公電分攤：</span>
                                      <span>{res.commonKwh.toFixed(1)} 度 (${res.commonCost.toFixed(1)})</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>冷氣用電：</span>
                                      <span>{res.totalAcKwh.toFixed(1)} 度 (${res.totalAcCost.toFixed(1)})</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200/60">
                                      <span>總用電度數：</span>
                                      <span>{res.totalKwh.toFixed(1)} 度</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Copy LINE Summary Button for this record */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleCopyHistorySummary(record)}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                          >
                            {copiedId === record.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>已複製此期 LINE 請款單！</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>複製此期 LINE 請款文字</span>
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <span>☁️ 資料即時同步於 Firebase Firestore</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>

      </div>
    </div>
  );
};
