import React, { useState } from 'react';
import { BillConfig, CalculationResult } from '../types';
import { generateLineTextSummary } from '../utils/calculator';
import { X, Copy, Check, MessageSquare, Share2 } from 'lucide-react';

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BillConfig;
  result: CalculationResult;
}

export const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  config,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const summaryText = generateLineTextSummary(config, result);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">LINE 請款訊息生成</h3>
              <p className="text-xs text-emerald-100/80">可直接複製傳送至室友群組或通訊軟體</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview Box */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>請款文字預覽：</span>
            <span>點擊下方按鈕即可複製</span>
          </div>

          <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner selection:bg-emerald-500 selection:text-slate-950">
            {summaryText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {copied ? (
              <span className="text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>已成功複製至剪貼簿！</span>
              </span>
            ) : (
              <span>已依照精確度數與金額排版完成</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer w-1/2 sm:w-auto"
            >
              關閉
            </button>

            <button
              onClick={handleCopy}
              id="btn-copy-clipboard"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 w-1/2 sm:w-auto"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>已複製！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>一鍵複製文字</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
