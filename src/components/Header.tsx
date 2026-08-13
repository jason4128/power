import React from 'react';
import { Zap, RotateCcw, Sparkles, History, Share2, Info } from 'lucide-react';

interface HeaderProps {
  onLoadExample: () => void;
  onReset: () => void;
  onOpenHistory: () => void;
  onOpenShare: () => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadExample,
  onReset,
  onOpenHistory,
  onOpenShare,
  onOpenGuide,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">
                  電費分攤計算系統
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  台電抄表/分電表
                </span>
              </div>
              <p className="text-xs text-slate-400">
                獨立冷氣抄表 • 公用電費自動平攤 • 一鍵請款通知
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onLoadExample}
              id="btn-load-example"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer"
              title="載入 500度/$2000 3台冷氣 3人分攤的範例情境"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>載入題目範例</span>
            </button>

            <button
              onClick={onOpenShare}
              id="btn-share-receipt"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>LINE 請款單</span>
            </button>

            <button
              onClick={onOpenHistory}
              id="btn-open-history"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>歷史紀錄</span>
            </button>

            <button
              onClick={onOpenGuide}
              id="btn-open-guide"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="台電電價階梯與參考說明"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>電價說明</span>
            </button>

            <button
              onClick={onReset}
              id="btn-reset-form"
              className="inline-flex items-center space-x-1 px-2 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="重置全部輸入"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">重置</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
