import React, { useState, useEffect, useMemo } from 'react';
import { BillConfig, Resident, SubMeter, HistoryRecord } from './types';
import {
  calculateBill,
  getPromptExampleData,
} from './utils/calculator';
import { subscribeToBillsFromFirebase, saveBillToFirebase } from './lib/firebase';
import { Header } from './components/Header';
import { BillSummaryCard } from './components/BillSummaryCard';
import { ResidentsManager } from './components/ResidentsManager';
import { SubMetersManager } from './components/SubMetersManager';
import { PublicElectricityCard } from './components/PublicElectricityCard';
import { ResultsBreakdown } from './components/ResultsBreakdown';
import { ShareReceiptModal } from './components/ShareReceiptModal';
import { HistoryModal } from './components/HistoryModal';
import { TaipowerRateGuide } from './components/TaipowerRateGuide';
import { Sparkles, ShieldCheck, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';

const DRAFT_STORAGE_KEY = 'taipower_bill_calc_draft_v1';
const DRAFT_PERIODS_KEY = 'taipower_bill_calc_period_drafts_v2';

export default function App() {
  const exampleData = useMemo(() => getPromptExampleData(), []);

  // Firebase history records
  const [firebaseHistory, setFirebaseHistory] = useState<HistoryRecord[]>([]);

  // Active notification notice
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  // Period drafts store
  const [periodDrafts, setPeriodDrafts] = useState<
    Record<string, { config: BillConfig; residents: Resident[]; subMeters: SubMeter[] }>
  >(() => {
    try {
      const saved = localStorage.getItem(DRAFT_PERIODS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Subscribe to Firebase bills in real-time
  useEffect(() => {
    const unsubscribe = subscribeToBillsFromFirebase((records) => {
      setFirebaseHistory(records);
    });
    return () => unsubscribe();
  }, []);

  // Initialize state with default prompt example data or saved draft
  const [config, setConfig] = useState<BillConfig>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.config) return parsed.config;
      }
    } catch (e) {
      console.error(e);
    }
    return exampleData.config;
  });

  const [residents, setResidents] = useState<Resident[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.residents) return parsed.residents;
      }
    } catch (e) {
      console.error(e);
    }
    return exampleData.residents;
  });

  const [subMeters, setSubMeters] = useState<SubMeter[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subMeters) return parsed.subMeters;
      }
    } catch (e) {
      console.error(e);
    }
    return exampleData.subMeters;
  });

  // Modals & Cloud Save Status
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Save current state as active draft in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ config, residents, subMeters })
      );
    } catch (e) {
      console.error('Failed to save draft', e);
    }
  }, [config, residents, subMeters]);

  // Compute live calculation result
  const result = useMemo(() => {
    return calculateBill(config, residents, subMeters);
  }, [config, residents, subMeters]);

  // Auto-save to Firebase Firestore with debounce (1.2s)
  useEffect(() => {
    // Only auto-save if bill has a valid total or is actively being filled
    if (config.totalAmount <= 0 && config.totalKwh <= 0) return;

    setCloudSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const year = config.year || 2026;
        const period = config.monthPeriod || '12-1月';
        const cleanPeriod = period.replace(/[^0-9a-zA-Z]/g, '');
        const recordId = `bill_${year}_${cleanPeriod}`;

        const recordToSave: HistoryRecord = {
          id: recordId,
          createdAt: new Date().toISOString(),
          periodName: config.title || `${year}年 ${period} 電費帳單`,
          config,
          residents,
          subMeters,
          result,
        };

        await saveBillToFirebase(recordToSave);
        setCloudSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save to Firebase failed:', err);
        setCloudSaveStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [config, residents, subMeters, result]);

  const handlePeriodSwitch = (newYear: number, newMonthPeriod: string, newNote: string = '') => {
    const currentYear = config.year || 2026;
    const currentMonthPeriod = config.monthPeriod || '12-1月';
    const currentKey = `${currentYear}_${currentMonthPeriod}`;
    const targetKey = `${newYear}_${newMonthPeriod}`;

    if (currentKey === targetKey) {
      const notePart = newNote.trim() ? ` (${newNote.trim()})` : '';
      const newTitle = `${newYear}年 ${newMonthPeriod} 電費帳單${notePart}`;
      setConfig((prev) => ({
        ...prev,
        year: newYear,
        monthPeriod: newMonthPeriod,
        customNote: newNote,
        title: newTitle,
      }));
      return;
    }

    // Save current active state into draft store
    const updatedDrafts = {
      ...periodDrafts,
      [currentKey]: { config, residents, subMeters },
    };
    setPeriodDrafts(updatedDrafts);
    try {
      localStorage.setItem(DRAFT_PERIODS_KEY, JSON.stringify(updatedDrafts));
    } catch (e) {
      console.error(e);
    }

    // 1. Check if draft exists for target period
    if (updatedDrafts[targetKey]) {
      const draft = updatedDrafts[targetKey];
      setConfig(draft.config);
      setResidents(draft.residents);
      setSubMeters(draft.subMeters);
      setActiveNotice(`已切換至【${newYear}年 ${newMonthPeriod}】！載入先前試算草稿。`);
      return;
    }

    // 2. Check if Firebase history contains this period
    const savedInFirebase = firebaseHistory.find((r) => {
      const rYear = r.config?.year;
      const rPeriod = r.config?.monthPeriod;
      if (rYear === newYear && rPeriod === newMonthPeriod) return true;
      return r.periodName?.includes(`${newYear}年`) && r.periodName?.includes(newMonthPeriod);
    });

    if (savedInFirebase) {
      setConfig(savedInFirebase.config);
      setResidents(savedInFirebase.residents);
      setSubMeters(savedInFirebase.subMeters);
      setActiveNotice(`已切換至【${newYear}年 ${newMonthPeriod}】！已從 Firebase 載入歷史紀錄。`);
      return;
    }

    // 3. BRAND NEW PERIOD:
    // Reset bill total amount & total kWh to 0 (so input fields are blank for the new bill)
    const notePart = newNote.trim() ? ` (${newNote.trim()})` : '';
    const newTitle = `${newYear}年 ${newMonthPeriod} 電費帳單${notePart}`;
    const newConfig: BillConfig = {
      title: newTitle,
      year: newYear,
      monthPeriod: newMonthPeriod,
      customNote: newNote,
      totalAmount: 0,
      totalKwh: 0,
      roundingMode: 'round',
      autoBalanceDifference: true,
    };

    // Auto-inherit previous readings for sub-meters from current period's current readings!
    const inheritedSubMeters = subMeters.map((meter) => {
      const lastReading =
        meter.inputMode === 'readings'
          ? meter.currentReading || meter.previousReading || 0
          : (meter.previousReading || 0) + (meter.directKwh || 0);

      return {
        ...meter,
        inputMode: 'readings' as const,
        previousReading: lastReading, // 前期抄表度數自動帶入上一期的本期抄表數字！
        currentReading: lastReading,  // 本期預設等於前期，等待輸入新抄表數字
        directKwh: 0,
      };
    });

    setConfig(newConfig);
    setSubMeters(inheritedSubMeters);

    const meterSummary = inheritedSubMeters
      .map((m) => `${m.name}: ${m.previousReading}度`)
      .join(' • ');

    setActiveNotice(
      `已建立【${newYear}年 ${newMonthPeriod}】新期別！帳單金額與度數已清空，冷氣前期抄表已自動帶入上期抄表 (${meterSummary || '尚無獨立冷氣'})`
    );
  };

  const handleLoadExample = () => {
    const data = getPromptExampleData();
    setConfig(data.config);
    setResidents(data.residents);
    setSubMeters(data.subMeters);
    setActiveNotice('已載入預設試算情境數值。');
  };

  const handleReset = () => {
    if (window.confirm('確定要清空並重置所有輸入數值嗎？')) {
      setConfig({
        title: '2026年 12-1月 電費帳單',
        year: 2026,
        monthPeriod: '12-1月',
        totalAmount: 0,
        totalKwh: 0,
        roundingMode: 'round',
        autoBalanceDifference: true,
      });
      setResidents([
        { id: 'res-a', name: '成員 A', color: '#3b82f6', weight: 1 },
        { id: 'res-b', name: '成員 B', color: '#10b981', weight: 1 },
      ]);
      setSubMeters([]);
      setActiveNotice('已清空重置表單。');
    }
  };

  const handleLoadHistoryRecord = (
    newConfig: BillConfig,
    newResidents: Resident[],
    newSubMeters: SubMeter[]
  ) => {
    setConfig(newConfig);
    setResidents(newResidents);
    setSubMeters(newSubMeters);
    setActiveNotice(`已載入歷史紀錄：${newConfig.title}`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased pb-16">
      {/* Top Navbar Header */}
      <Header
        onLoadExample={handleLoadExample}
        onReset={handleReset}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenGuide={() => {
          const el = document.getElementById('section-rate-guide');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Firebase Cloud Sync Status Bar */}
        <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-2xs text-xs gap-2">
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-bold text-slate-800">Firebase 雲端自動同步</span>
            <span className="text-slate-300">|</span>
            {cloudSaveStatus === 'saving' && (
              <span className="flex items-center space-x-1.5 text-amber-600 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>正在同步儲存至 Firebase...</span>
              </span>
            )}
            {cloudSaveStatus === 'saved' && (
              <span className="flex items-center space-x-1.5 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>已自動即時儲存至 Firebase 雲端資料庫</span>
              </span>
            )}
            {cloudSaveStatus === 'error' && (
              <span className="text-rose-600 font-semibold">
                自動儲存失敗，系統會在下次輸入時重試
              </span>
            )}
            {cloudSaveStatus === 'idle' && (
              <span className="text-slate-500">
                輸入資料會自動同步至 Firebase
              </span>
            )}
          </div>
          <button
            onClick={() => setIsHistoryOpen(true)}
            id="btn-cloud-history-link"
            className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer text-xs shrink-0"
          >
            查看 Firebase 雲端歷史紀錄 ({firebaseHistory.length} 筆)
          </button>
        </div>
        
        {/* Notice Banner */}
        {activeNotice && (
          <div className="bg-amber-500/10 border border-amber-300/80 text-amber-900 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{activeNotice}</span>
            </div>
            <button
              onClick={() => setActiveNotice(null)}
              className="text-amber-700 hover:text-amber-950 text-xs font-extrabold cursor-pointer ml-3 shrink-0"
            >
              ✕ 關閉
            </button>
          </div>
        )}

        {/* Quick Example Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-300/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 block text-sm">
                已預載題目試算情境 (500度 / $2000元，平均每度$4.0元)
              </span>
              <span className="text-slate-600">
                冷氣1 (100度由A,B共用) • 冷氣2 (50度C獨立) • 冷氣3 (25度C獨立) • 公電325度 (A,B,C 3人均攤)
              </span>
            </div>
          </div>

          <button
            onClick={handleLoadExample}
            id="btn-banner-load-example"
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            重置為範例數值
          </button>
        </div>

        {/* Section 1: Bill Summary Input */}
        <BillSummaryCard
          config={config}
          onChange={setConfig}
          onPeriodSwitch={handlePeriodSwitch}
          unitPrice={result.unitPrice}
        />

        {/* Section 2: Residents Manager */}
        <ResidentsManager residents={residents} onChange={setResidents} />

        {/* Section 3: Sub-meters / AC Manager */}
        <SubMetersManager
          subMeters={subMeters}
          residents={residents}
          onChange={setSubMeters}
          unitPrice={result.unitPrice}
        />

        {/* Section 4: Public Electricity Breakdown */}
        <PublicElectricityCard
          result={result}
          totalBillKwh={config.totalKwh}
          totalBillAmount={config.totalAmount}
          residents={residents}
        />

        {/* Section 5: Individual Calculation Results */}
        <ResultsBreakdown
          result={result}
          config={config}
          onOpenShare={() => setIsShareOpen(true)}
        />

        {/* Section 6: Taipower Rate Guide */}
        <div id="section-rate-guide">
          <TaipowerRateGuide />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>台電電費分攤計算系統 • 純前端安全無伺服器暫存</span>
          </div>
          <div>
            支援冷氣獨立電表、多人員共用攤平與 LINE 請款單產出
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ShareReceiptModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        config={config}
        result={result}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentConfig={config}
        currentResidents={residents}
        currentSubMeters={subMeters}
        currentResult={result}
        onLoadRecord={handleLoadHistoryRecord}
      />
    </div>
  );
}

