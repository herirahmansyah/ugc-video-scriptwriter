import React from 'react';
import { History, X, Trash2, Clock, Video, ArrowRight, Download, FileText } from 'lucide-react';
import { UGCScriptResult } from '../types';

interface SavedScriptsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedScripts: UGCScriptResult[];
  onSelectScript: (script: UGCScriptResult) => void;
  onDeleteScript: (id: string) => void;
  onClearAll: () => void;
}

export const SavedScriptsDrawer: React.FC<SavedScriptsDrawerProps> = ({
  isOpen,
  onClose,
  savedScripts,
  onSelectScript,
  onDeleteScript,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const exportAllJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedScripts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `UGC_Scripts_Archive_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div
        id="saved-scripts-drawer"
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Riwayat Script UGC ({savedScripts.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tersimpan di browser lokal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedScripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Belum ada script tersimpan
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Setiap script yang digenerate akan otomatis diarsipkan di sini.
              </p>
            </div>
          ) : (
            savedScripts.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-indigo-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 cursor-pointer" onClick={() => { onSelectScript(item); onClose(); }}>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {item.platform.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="mt-1.5 line-clamp-1 text-xs font-bold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                      {item.title}
                    </h4>

                    <p className="mt-1 line-clamp-2 text-[11px] italic text-slate-600 dark:text-slate-400">
                      "{item.hook.openingLine}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScript(item.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 transition"
                    title="Hapus script"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
                  <span>{item.storyboard?.length || 4} Shots Storyboard</span>
                  <button
                    type="button"
                    onClick={() => { onSelectScript(item); onClose(); }}
                    className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Buka Script <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {savedScripts.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Hapus Semua
            </button>
            <button
              type="button"
              onClick={exportAllJSON}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Ekspor Arsip (JSON)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
