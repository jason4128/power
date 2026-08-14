import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BillConfig, Resident, SubMeter, HistoryRecord, HouseholdProfile, MasterSubMeterDef } from './types';
import {
  calculateBill,
  getPromptExampleData,
} from './utils/calculator';
import {
  subscribeToBillsFromFirebase,
  saveBillToFirebase,
  saveHouseholdProfileToFirebase,
  subscribeToHouseholdProfileFromFirebase,
} from './lib/firebase';
import { Joyride, Step } from 'react-joyride';
import { Header } from './components/Header';
import { BillSummaryCard } from './components/BillSummaryCard';
import { ResidentsManager } from './components/ResidentsManager';
import { SubMetersManager } from './components/SubMetersManager';
import { PublicElectricityCard } from './components/PublicElectricityCard';
import { ResultsBreakdown } from './components/ResultsBreakdown';
import { ShareReceiptModal } from './components/ShareReceiptModal';
import { HistoryModal } from './components/HistoryModal';
import { TaipowerRateGuide } from './components/TaipowerRateGuide';
import { Sparkles, ShieldCheck, Cloud, RefreshCw, CheckCircle2, Home } from 'lucide-react';

const MASTER_PROFILE_KEY = 'taipower_household_master_profile_v2';
const DRAFT_STORAGE_KEY = 'taipower_bill_calc_draft_v2';
const DRAFT_PERIODS_KEY = 'taipower_bill_calc_period_drafts_v3';

interface PeriodDraftData {
  config: BillConfig;
  readings: {
    id: string;
    name: string;
    previousReading: number;
    currentReading: number;
    directKwh: number;
    inputMode: 'direct' | 'readings';
    assignedResidentIds?: string[];
  }[];
}

export default function App() {
  const exampleData = useMemo(() => getPromptExampleData(), []);

  // Firebase history records
  const [firebaseHistory, setFirebaseHistory] = useState<HistoryRecord[]>([]);

  // Active notification notice
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  // Master Household Profile (Residents & Sub-meter list that persists across all periods)
  const [masterProfile, setMasterProfile] = useState<HouseholdProfile>(() => {
    try {
      const saved = localStorage.getItem(MASTER_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.residents && parsed.residents.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load master profile from localStorage:', e);
    }
    return {
      residents: exampleData.residents,
      meters: exampleData.subMeters.map((m) => ({
        id: m.id,
        name: m.name,
        assignedResidentIds: m.assignedResidentIds,
        inputMode: m.inputMode,
      })),
    };
  });

  // Period drafts store (Stores month-specific meter readings & bill totals)
  const [periodDrafts, setPeriodDrafts] = useState<Record<string, PeriodDraftData>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_PERIODS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Current active bill config
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

  // Current active residents (Synchronized with master profile)
  const [residents, setResidents] = useState<Resident[]>(() => {
    try {
      const savedMaster = localStorage.getItem(MASTER_PROFILE_KEY);
      if (savedMaster) {
        const parsed = JSON.parse(savedMaster);
        if (parsed.residents && parsed.residents.length > 0) return parsed.residents;
      }
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.residents && parsed.residents.length > 0) return parsed.residents;
      }
    } catch (e) {
      console.error(e);
    }
    return exampleData.residents;
  });

  // Current active sub-meters (Meters definitions come from master profile, readings from draft/current)
  const [subMeters, setSubMeters] = useState<SubMeter[]>(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.subMeters && parsed.subMeters.length > 0) return parsed.subMeters;
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

  const [runTour, setRunTour] = useState(false);

  const tourSteps: Step[] = [
    {
      target: '#btn-start-tour',
      content: '歡迎使用電費分攤計算系統！只需幾個簡單步驟，就能自動分攤室友公用與獨立電費。',
    },
    {
      target: '#section-bill-summary',
      content: '首先，請在這裡輸入台電帳單的「總金額」與「總度數」，並選擇要計算的「帳單期別」。',
    },
    {
      target: '#section-residents',
      content: '接著新增室友名單！系統會跨月份記憶這些成員，不需每期重新輸入。',
    },
    {
      target: '#section-submeters',
      content: '如果有獨立冷氣，請在此新增並指派共用的室友。每期只需輸入「本期抄表度數」，前期度數會自動帶入！',
    },
    {
      target: '#section-results',
      content: '系統會自動結算每個人應繳的金額！點擊下方的「LINE 請款單」即可一鍵複製帳單明細傳給室友。',
    },
    {
      target: '#btn-open-history',
      content: '需要查看或儲存之前的帳單時，點擊這裡開啟「歷史紀錄」即可輕鬆管理所有月份的帳單。',
    }
  ];

  // Ref to track if initial cloud sync has been completed
  const hasInitializedFromCloud = useRef(false);

  // 1. Subscribe to Firebase Master Profile
  useEffect(() => {
    const unsubscribe = subscribeToHouseholdProfileFromFirebase((cloudProfile) => {
      if (cloudProfile && cloudProfile.residents && cloudProfile.residents.length > 0) {
        if (!hasInitializedFromCloud.current) {
          hasInitializedFromCloud.current = true;
          setMasterProfile(cloudProfile);
          setResidents(cloudProfile.residents);
          // Sync sub-meter names & assignments from cloud profile while preserving readings
          setSubMeters((prevMeters) => {
            return cloudProfile.meters.map((cm) => {
              const existing = prevMeters.find((m) => m.id === cm.id || m.name === cm.name);
              return {
                id: cm.id,
                name: cm.name,
                assignedResidentIds: cm.assignedResidentIds,
                inputMode: cm.inputMode || existing?.inputMode || 'readings',
                previousReading: existing ? existing.previousReading : 0,
                currentReading: existing ? existing.currentReading : 0,
                directKwh: existing ? existing.directKwh : 0,
              };
            });
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firebase bills in real-time
  useEffect(() => {
    const unsubscribe = subscribeToBillsFromFirebase((records) => {
      setFirebaseHistory(records);
    });
    return () => unsubscribe();
  }, []);

  // 3. Helper to update and persist Master Profile (Residents & AC definitions)
  const updateMasterProfile = (newResidents: Resident[], newMeters: SubMeter[]) => {
    const newProfile: HouseholdProfile = {
      residents: newResidents,
      meters: newMeters.map((m) => ({
        id: m.id,
        name: m.name,
        assignedResidentIds: m.assignedResidentIds,
        inputMode: m.inputMode,
      })),
      updatedAt: new Date().toISOString(),
    };
    setMasterProfile(newProfile);
    try {
      localStorage.setItem(MASTER_PROFILE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.error('Failed to save master profile locally:', e);
    }
    saveHouseholdProfileToFirebase(newProfile).catch((err) =>
      console.error('Failed to sync master profile to Firebase:', err)
    );
  };

  // Handler for updating Residents
  const handleResidentsChange = (updatedResidents: Resident[]) => {
    setResidents(updatedResidents);
    updateMasterProfile(updatedResidents, subMeters);
  };

  // Handler for updating SubMeters
  const handleSubMetersChange = (updatedSubMeters: SubMeter[]) => {
    setSubMeters(updatedSubMeters);
    updateMasterProfile(residents, updatedSubMeters);
  };

  // Save current active state in localStorage draft
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

  // Auto-save active period bill to Firebase Firestore with debounce (1.2s)
  useEffect(() => {
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

  // Seamless Period Switcher: Preserves household members & AC names across all months!
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

    // 1. Save current period's meter readings and bill totals into periodDrafts
    const currentDraftData: PeriodDraftData = {
      config,
      readings: subMeters.map((m) => ({
        id: m.id,
        name: m.name,
        previousReading: m.previousReading,
        currentReading: m.currentReading,
        directKwh: m.directKwh,
        inputMode: m.inputMode,
        assignedResidentIds: m.assignedResidentIds,
      })),
    };

    const updatedDrafts = {
      ...periodDrafts,
      [currentKey]: currentDraftData,
    };
    setPeriodDrafts(updatedDrafts);
    try {
      localStorage.setItem(DRAFT_PERIODS_KEY, JSON.stringify(updatedDrafts));
    } catch (e) {
      console.error(e);
    }

    // Master list of sub-meter definitions (names, assigned residents, IDs)
    const masterMetersList = (masterProfile.meters && masterProfile.meters.length > 0)
      ? masterProfile.meters
      : subMeters.map((m) => ({
          id: m.id,
          name: m.name,
          assignedResidentIds: m.assignedResidentIds,
          inputMode: m.inputMode,
        }));

    // Active residents list NEVER reverts to placeholder
    const activeResidents = (masterProfile.residents && masterProfile.residents.length > 0)
      ? masterProfile.residents
      : residents;

    // 2. Check if draft exists for target period
    if (updatedDrafts[targetKey]) {
      const draft = updatedDrafts[targetKey];
      setConfig(draft.config);
      setResidents(activeResidents);

      // Reconstruct sub-meters by matching master meter definitions with draft readings
      const targetMeters: SubMeter[] = masterMetersList.map((masterMeter) => {
        const foundReading = draft.readings.find(
          (r) => r.id === masterMeter.id || r.name === masterMeter.name
        );
        return {
          id: masterMeter.id,
          name: masterMeter.name,
          assignedResidentIds: masterMeter.assignedResidentIds,
          inputMode: (foundReading?.inputMode || masterMeter.inputMode || 'readings') as 'readings' | 'direct',
          previousReading: foundReading ? foundReading.previousReading : 0,
          currentReading: foundReading ? foundReading.currentReading : 0,
          directKwh: foundReading ? foundReading.directKwh : 0,
        };
      });

      setSubMeters(targetMeters);
      setActiveNotice(`已切換至【${newYear}年 ${newMonthPeriod}】！已載入此月份的抄表與帳單資料（住戶與冷氣配置保持一致）。`);
      return;
    }

    // 3. Check if Firebase history contains this period
    const savedInFirebase = firebaseHistory.find((r) => {
      const rYear = r.config?.year;
      const rPeriod = r.config?.monthPeriod;
      if (rYear === newYear && rPeriod === newMonthPeriod) return true;
      return r.periodName?.includes(`${newYear}年`) && r.periodName?.includes(newMonthPeriod);
    });

    if (savedInFirebase) {
      setConfig(savedInFirebase.config);
      setResidents(activeResidents);

      // Reconstruct sub-meters by matching master meter definitions with Firebase readings
      const targetMeters: SubMeter[] = masterMetersList.map((masterMeter) => {
        const foundMeter = savedInFirebase.subMeters?.find(
          (m) => m.id === masterMeter.id || m.name === masterMeter.name
        );
        return {
          id: masterMeter.id,
          name: masterMeter.name,
          assignedResidentIds: masterMeter.assignedResidentIds,
          inputMode: (foundMeter?.inputMode || masterMeter.inputMode || 'readings') as 'readings' | 'direct',
          previousReading: foundMeter ? foundMeter.previousReading : 0,
          currentReading: foundMeter ? foundMeter.currentReading : 0,
          directKwh: foundMeter ? foundMeter.directKwh : 0,
        };
      });

      setSubMeters(targetMeters);
      setActiveNotice(`已切換至【${newYear}年 ${newMonthPeriod}】！已從 Firebase 載入此月份資料。`);
      return;
    }

    // 4. BRAND NEW PERIOD:
    // Keep household members & AC names intact!
    // Clear bill amount & kWh to 0 (so input fields are clean for new bill)
    // Auto-carry forward latest readings as previousReading for each AC!
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

    const inheritedSubMeters: SubMeter[] = masterMetersList.map((masterMeter) => {
      // Find current reading from the active sub-meters in the preceding period
      const currentMeter = subMeters.find(
        (m) => m.id === masterMeter.id || m.name === masterMeter.name
      );
      const lastReading = currentMeter
        ? currentMeter.inputMode === 'readings'
          ? currentMeter.currentReading || currentMeter.previousReading || 0
          : (currentMeter.previousReading || 0) + (currentMeter.directKwh || 0)
        : 0;

      return {
        id: masterMeter.id,
        name: masterMeter.name,
        assignedResidentIds: masterMeter.assignedResidentIds,
        inputMode: 'readings',
        previousReading: lastReading, // 前期度數自動帶入上一期抄表數字
        currentReading: lastReading,  // 本期預設等於前期 (用電0度)，等待填入新數字
        directKwh: 0,
      };
    });

    setConfig(newConfig);
    setResidents(activeResidents);
    setSubMeters(inheritedSubMeters);

    const meterSummary = inheritedSubMeters
      .map((m) => `${m.name}: 前期 ${m.previousReading} 度`)
      .join(' • ');

    setActiveNotice(
      `已切換至【${newYear}年 ${newMonthPeriod}】！住戶名單與冷氣名稱均已完整保留，帳單金額度數已清空，前期抄表已自動帶入上期抄表度數 (${meterSummary || '尚無獨立冷氣'})。`
    );
  };

  const handleLoadHistoryRecord = (
    newConfig: BillConfig,
    newResidents: Resident[],
    newSubMeters: SubMeter[]
  ) => {
    setConfig(newConfig);
    setResidents(newResidents);
    setSubMeters(newSubMeters);
    updateMasterProfile(newResidents, newSubMeters);
    setActiveNotice(`已載入歷史紀錄：${newConfig.title}`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased pb-16">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        locale={{
          back: '上一步',
          close: '關閉',
          last: '完成',
          next: '下一步',
          skip: '略過',
        }}
        options={{
          primaryColor: '#6366f1',
          zIndex: 1000,
        }}
        onEvent={(data) => {
          const { status } = data;
          if (status === 'finished' || status === 'skipped') {
            setRunTour(false);
          }
        }}
      />

      {/* Top Navbar Header */}
      <Header
        onStartTour={() => setRunTour(true)}
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

        {/* Section 1: Bill Summary Input */}
        <div id="section-bill-summary">
          <BillSummaryCard
            config={config}
            onChange={setConfig}
            onPeriodSwitch={handlePeriodSwitch}
            unitPrice={result.unitPrice}
          />
        </div>

        {/* Section 2: Residents Manager */}
        <div id="section-residents">
          <ResidentsManager residents={residents} onChange={handleResidentsChange} />
        </div>

        {/* Section 3: Sub-meters / AC Manager */}
        <div id="section-submeters">
          <SubMetersManager
            subMeters={subMeters}
            residents={residents}
            onChange={handleSubMetersChange}
            unitPrice={result.unitPrice}
          />
        </div>

        {/* Section 4: Public Electricity Breakdown */}
        <PublicElectricityCard
          result={result}
          totalBillKwh={config.totalKwh}
          totalBillAmount={config.totalAmount}
          residents={residents}
        />

        {/* Section 5: Individual Calculation Results */}
        <div id="section-results">
          <ResultsBreakdown
            result={result}
            config={config}
            onOpenShare={() => setIsShareOpen(true)}
          />
        </div>

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

