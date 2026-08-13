import React from 'react';
import { Resident } from '../types';
import { Users, UserPlus, Trash2, ShieldAlert } from 'lucide-react';

interface ResidentsManagerProps {
  residents: Resident[];
  onChange: (updatedResidents: Resident[]) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const ResidentsManager: React.FC<ResidentsManagerProps> = ({
  residents,
  onChange,
}) => {
  const handleAddResident = () => {
    const nextIndex = residents.length + 1;
    const defaultNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const letter = defaultNames[residents.length] || `成員 ${nextIndex}`;
    const name = `成員 ${letter}`;
    const color = PRESET_COLORS[(residents.length) % PRESET_COLORS.length];

    const newResident: Resident = {
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      color,
      weight: 1,
    };

    onChange([...residents, newResident]);
  };

  const handleUpdateResident = (id: string, field: keyof Resident, value: any) => {
    const updated = residents.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    onChange(updated);
  };

  const handleRemoveResident = (id: string) => {
    if (residents.length <= 1) {
      alert('系統至少需保留 1 位住戶成員。');
      return;
    }
    const updated = residents.filter((r) => r.id !== id);
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">2. 分攤成員 / 住戶名單</h2>
            <p className="text-xs text-slate-500">設定參與電費與公電均攤的人數</p>
          </div>
        </div>

        <button
          onClick={handleAddResident}
          id="btn-add-resident"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>新增成員</span>
        </button>
      </div>

      {residents.length === 0 ? (
        <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs">請點擊上方「新增成員」加入參與分攤之住戶</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {residents.map((resident) => (
            <div
              key={resident.id}
              className="group relative p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={resident.color}
                    onChange={(e) =>
                      handleUpdateResident(resident.id, 'color', e.target.value)
                    }
                    className="w-5 h-5 rounded-full border-0 cursor-pointer overflow-hidden p-0 shadow-xs"
                    title="選擇標記顏色"
                  />
                  <input
                    type="text"
                    value={resident.name}
                    onChange={(e) =>
                      handleUpdateResident(resident.id, 'name', e.target.value)
                    }
                    className="text-sm font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:bg-white px-1 py-0.5 rounded transition-colors w-28"
                    placeholder="成員姓名"
                  />
                </div>

                <button
                  onClick={() => handleRemoveResident(resident.id)}
                  className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="刪除成員"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                <span>公電分攤權重:</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={resident.weight}
                    onChange={(e) =>
                      handleUpdateResident(
                        resident.id,
                        'weight',
                        Math.max(0, Number(e.target.value))
                      )
                    }
                    className="w-12 px-1.5 py-0.5 text-center font-medium border border-slate-200 rounded bg-white text-xs"
                  />
                  <span className="text-[10px] text-slate-400">份</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
