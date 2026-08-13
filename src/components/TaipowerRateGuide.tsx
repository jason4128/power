import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Zap, Info } from 'lucide-react';

export const TaipowerRateGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              💡 台電累進電價費率參考說明 (夏月與非夏月)
            </h3>
            <p className="text-xs text-slate-500">
              瞭解台電住宅電價的階梯式計費與平均單價運算原理
            </p>
          </div>
        </div>

        <div className="p-1 rounded-lg text-slate-400 bg-slate-100">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs text-slate-600">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">分攤計算建議說明：</p>
              <p className="mt-0.5 text-amber-800">
                本系統採「<strong>總電費 ÷ 總用電度數 = 實際平均單價</strong>
                」為基準分攤，這是最公平且簡便的共享方式，確保每位分攤者負擔的單價皆一致反映台電本期帳單的實付單價。
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">用電級距 (月/度)</th>
                  <th className="p-2.5">夏月費率 (6/1~9/30)</th>
                  <th className="p-2.5">非夏月費率 (10/1~5/31)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-medium">120 度以下部分</td>
                  <td className="p-2.5 text-emerald-700 font-semibold">$1.68 元</td>
                  <td className="p-2.5 text-emerald-700 font-semibold">$1.68 元</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">121 ~ 330 度部分</td>
                  <td className="p-2.5">$2.45 元</td>
                  <td className="p-2.5">$2.16 元</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">331 ~ 500 度部分</td>
                  <td className="p-2.5">$3.70 元</td>
                  <td className="p-2.5">$3.03 元</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">501 ~ 700 度部分</td>
                  <td className="p-2.5">$5.04 元</td>
                  <td className="p-2.5">$4.14 元</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">701 ~ 1000 度部分</td>
                  <td className="p-2.5 text-rose-700 font-bold">$6.24 元</td>
                  <td className="p-2.5 text-rose-700 font-bold">$5.07 元</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">1001 度以上部分</td>
                  <td className="p-2.5 text-rose-800 font-black">$7.69 元</td>
                  <td className="p-2.5 text-rose-800 font-black">$6.03 元</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-400">
            註：台電帳單通常為「雙月（兩個月）寄送一次」，因此實際累進級距度數為單月之兩倍（例如 240度以下、241~660度...以此類推）。
          </div>
        </div>
      )}
    </div>
  );
};
