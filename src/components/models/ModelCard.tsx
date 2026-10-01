import React from 'react';
import {
  Download,
  CheckCircle,
  Play,
  Trash2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  HardDrive,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { OfflineModelInfo, ModelDownloadProgress } from '../../types';

interface ModelCardProps {
  model: OfflineModelInfo;
  isActive: boolean;
  downloadProgress?: ModelDownloadProgress;
  onDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onBenchmark?: (id: string) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isActive,
  downloadProgress,
  onDownload,
  onCancelDownload,
  onActivate,
  onDelete,
  onBenchmark
}) => {
  const isDownloading = downloadProgress?.status === 'downloading';

  return (
    <div
      className={`rounded-2xl p-4 transition-all border ${
        isActive
          ? 'bg-[#152033] border-[#00e5ff] shadow-[0_0_20px_rgba(0,229,255,0.2)]'
          : 'bg-[#121824] border-[#2d3748] hover:border-[#8b5cf6]/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isActive
                ? 'bg-[#00e5ff]/20 border-[#00e5ff]/50 text-[#00e5ff]'
                : 'bg-[#1e2638] border-white/10 text-gray-300'
            }`}
          >
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide break-words">{model.name}</h3>
              {isActive && (
                <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0">
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span>AKTYWNY</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap text-[11px] text-gray-400">
              <span className="bg-[#1e2638] px-2 py-0.5 rounded text-gray-300 font-mono text-[10px] shrink-0">
                {model.format}
              </span>
              <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] font-semibold px-2 py-0.5 rounded text-[10px] shrink-0">
                {model.precision}
              </span>
              <span className="shrink-0">{model.sizeMB >= 1000 ? `${(model.sizeMB / 1024).toFixed(2)} GB` : `${model.sizeMB} MB`}</span>
              <span className="shrink-0">•</span>
              <span className="text-gray-300 truncate">{model.author}</span>
            </div>
          </div>
        </div>

        {/* Delete action */}
        {model.isInstalled && (
          <button
            type="button"
            onClick={() => onDelete(model.id)}
            title="Usuń wagi modelu z pamięci urządzenia"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-2 mb-3 leading-relaxed break-words">
        {model.description}
      </p>

      {/* Hardware requirement badge */}
      <div className="flex items-center justify-between text-[11px] bg-[#0a0e14] px-3 py-1.5 rounded-xl border border-white/5 mb-3 flex-wrap gap-1">
        <span className="text-gray-400">Wymagania: <span className="font-semibold text-[#00e5ff]">{model.recommendedHardware}</span></span>
        {model.huggingFaceRepo && (
          <span className="text-[10px] text-[#8b5cf6] font-mono bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/20">
            HF: {model.huggingFaceRepo}
          </span>
        )}
        {model.isCustomImport && (
          <span className="text-[10px] text-[#10b981] font-mono bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20">
            Dysk: {model.fileName || 'Plik lokalny'}
          </span>
        )}
      </div>

      {/* Download progress bar */}
      {isDownloading && downloadProgress && (
        <div className="space-y-1.5 mb-3 bg-[#0a0e14] p-3 rounded-xl border border-[#00e5ff]/30">
          <div className="flex justify-between text-xs text-[#00e5ff] font-semibold">
            <span>Pobieranie z HuggingFace Hub: {downloadProgress.progressPercent}%</span>
            <span>{downloadProgress.downloadedMB} / {downloadProgress.totalMB} MB</span>
          </div>

          <div className="w-full bg-[#1e2638] rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] h-2 rounded-full transition-all duration-200"
              style={{ width: `${downloadProgress.progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Prędkość: ~{downloadProgress.speedMBs} MB/s</span>
            <button
              type="button"
              onClick={() => onCancelDownload(model.id)}
              className="text-red-400 hover:underline"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        {model.isInstalled ? (
          <>
            {!isActive && (
              <button
                type="button"
                onClick={() => onActivate(model.id)}
                className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-[#00e5ff] hover:bg-[#00b4d8] text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.3)] active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
                <span>Ustaw jako aktywny</span>
              </button>
            )}

            {onBenchmark && (
              <button
                type="button"
                onClick={() => onBenchmark(model.id)}
                className="w-full sm:w-auto py-2 px-3 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-[#8b5cf6] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-[#8b5cf6]/30 active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>Testuj (Benchmark)</span>
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => onDownload(model.id)}
            disabled={isDownloading}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_15px_rgba(0,229,255,0.2)] active:scale-[0.98]"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Pobierz model offline ({model.sizeMB >= 1000 ? `${(model.sizeMB / 1024).toFixed(2)} GB` : `${model.sizeMB} MB`})</span>
          </button>
        )}
      </div>
    </div>
  );
};
