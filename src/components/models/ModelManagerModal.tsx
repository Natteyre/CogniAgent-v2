import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Download,
  Upload,
  HardDrive,
  X,
  Search,
  Plus,
  Play,
  CheckCircle,
  AlertCircle,
  FileCode,
  Sparkles,
  Zap,
  Layers,
  Activity,
  Terminal,
  Send,
  Loader2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { OfflineModelInfo, ModelDownloadProgress } from '../../types';
import { modelManager } from '../../services/modelManager';
import { ModelCard } from './ModelCard';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelChanged?: (model: OfflineModelInfo) => void;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({
  isOpen,
  onClose,
  onModelChanged
}) => {
  const [selectedTab, setSelectedTab] = useState<'catalog' | 'installed' | 'import' | 'playground'>('catalog');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'qwen' | 'gemma' | 'phi' | 'smollm' | 'light'>('all');
  const [models, setModels] = useState<OfflineModelInfo[]>(() => modelManager.getModels());
  const [activeModelId, setActiveModelId] = useState<string>(() => modelManager.getActiveModelId());
  const [downloads, setDownloads] = useState<Record<string, ModelDownloadProgress>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('850');
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);

  // Benchmark state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    latencyMs: number;
    tokensPerSecond: number;
    testResponse: string;
    ramUsageMB: number;
    modelName: string;
  } | null>(null);

  // Playground state
  const [playgroundPrompt, setPlaygroundPrompt] = useState('Wyjaśnij zalety kwantyzacji INT4 i formatu MediaPipe dla procesora Kirin 980.');
  const [playgroundStreamingText, setPlaygroundStreamingText] = useState('');
  const [playgroundIsRunning, setPlaygroundIsRunning] = useState(false);
  const [playgroundMetrics, setPlaygroundMetrics] = useState<{
    latencyMs: number;
    tokensPerSecond: number;
    backend: string;
    ramUsageMB: number;
    tokensCount: number;
    modelName: string;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubModels = modelManager.subscribeModelList((list) => {
      setModels(list);
      setActiveModelId(modelManager.getActiveModelId());
    });

    const unsubDownloads = modelManager.subscribeDownloadProgress((prog) => {
      setDownloads((prev) => ({
        ...prev,
        [prog.modelId]: prog
      }));
    });

    return () => {
      unsubModels();
      unsubDownloads();
    };
  }, []);

  if (!isOpen) return null;

  const handleDownload = (id: string) => {
    modelManager.startDownload(id);
  };

  const handleCancelDownload = (id: string) => {
    modelManager.cancelDownload(id);
  };

  const handleActivate = (id: string) => {
    modelManager.setActiveModel(id);
    setActiveModelId(id);
    const m = modelManager.getActiveModel();
    if (m && onModelChanged) onModelChanged(m);
  };

  const handleDelete = (id: string) => {
    modelManager.deleteModel(id);
  };

  const handleProcessFile = async (file: File) => {
    try {
      const imported = await modelManager.importLocalFile(file);
      setSelectedTab('installed');
      if (onModelChanged) onModelChanged(imported);
    } catch (err: any) {
      alert(`Błąd podczas wczytywania pliku modelu: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleAddCustomRepo = () => {
    if (customRepoInput.trim()) {
      const size = parseInt(customSizeInput, 10) || 850;
      modelManager.addHuggingFaceRepo(customRepoInput.trim(), customNameInput.trim() || undefined, size);
      setCustomRepoInput('');
      setCustomNameInput('');
      setShowAddRepoForm(false);
    }
  };

  const handleRunBenchmark = async (modelId: string) => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    const target = models.find((m) => m.id === modelId) || modelManager.getActiveModel();
    try {
      const res = await modelManager.runBenchmark(modelId);
      setBenchmarkResult({
        ...res,
        modelName: target?.name || 'Local SLM'
      });
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleRunPlayground = async () => {
    if (!playgroundPrompt.trim() || playgroundIsRunning) return;
    setPlaygroundIsRunning(true);
    setPlaygroundStreamingText('');
    setPlaygroundMetrics(null);

    try {
      const result = await modelManager.runInference(
        playgroundPrompt,
        activeModelId,
        (tokenProgress) => {
          setPlaygroundStreamingText(tokenProgress);
        }
      );
      setPlaygroundStreamingText(result.response);
      setPlaygroundMetrics({
        latencyMs: result.latencyMs,
        tokensPerSecond: result.tokensPerSecond,
        backend: result.backend,
        ramUsageMB: result.ramUsageMB,
        tokensCount: result.tokensCount,
        modelName: result.modelName
      });
    } finally {
      setPlaygroundIsRunning(false);
    }
  };

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.architecture.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.huggingFaceRepo && m.huggingFaceRepo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (catalogFilter === 'qwen') return m.architecture.toLowerCase().includes('qwen');
    if (catalogFilter === 'gemma') return m.architecture.toLowerCase().includes('gemma');
    if (catalogFilter === 'phi') return m.architecture.toLowerCase().includes('phi');
    if (catalogFilter === 'smollm') return m.architecture.toLowerCase().includes('smollm') || m.architecture.toLowerCase().includes('llama');
    if (catalogFilter === 'light') return m.sizeMB < 600;

    return true;
  });

  const installedModels = models.filter((m) => m.isInstalled);
  const totalDiskUsedMB = installedModels.reduce((acc, m) => acc + m.sizeMB, 0);
  const activeModel = models.find((m) => m.id === activeModelId) || models[0];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3 sm:p-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] p-0.5 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e5ff] shrink-0" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="truncate">Menedżer Modeli Offline SLM</span>
                <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0">
                  Gemma • Phi-3 • ONNX
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#94a3b8] mt-0.5 break-words line-clamp-1 sm:line-clamp-none">
                Pobieraj modele z HuggingFace Hub lub ładuj pliki wag z pamięci urządzenia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#0e141f] border-b border-[#2d3748] px-4 flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTab('catalog')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              selectedTab === 'catalog'
                ? 'border-[#00e5ff] text-[#00e5ff]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Katalog HuggingFace ({models.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('installed')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              selectedTab === 'installed'
                ? 'border-[#8b5cf6] text-[#8b5cf6]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Zainstalowane ({installedModels.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('import')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              selectedTab === 'import'
                ? 'border-[#00e5ff] text-[#00e5ff]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Wczytaj z urządzenia (.onnx / .task)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('playground')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              selectedTab === 'playground'
                ? 'border-[#10b981] text-[#10b981]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Konsola Testowa (Playground)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Dual-Engine Architecture Tandem Status */}
          <div className="bg-[#0a0e14] border border-[#2d3748] rounded-xl p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400">
                  Architektura Kaskadowa (Dual-Engine On-Device AI)
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                  TANDEM AKTYWNY
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono">14 ms NPU Fast-Path + Generative SLM</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Engine A: Permanent GLiNER Intent Router */}
              <div className="bg-[#121824] border border-emerald-500/40 rounded-xl p-2.5 space-y-1 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    SILNIK A: ROUTER NPU (STAŁY)
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                    14 ms | 38.4 MB
                  </span>
                </div>
                <div className="font-bold text-white text-xs">GLiNER Polish Multi-Intent Bi-Encoder</div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Aktywny na stałe w NPU/CPU. Błyskawicznie steruje sprzętem, latarką, makrami, powiadomieniami i OCR.
                </p>
              </div>

              {/* Engine B: Generative Chat SLM */}
              <div className="bg-[#121824] border border-[#8b5cf6]/40 rounded-xl p-2.5 space-y-1 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-[#8b5cf6] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    SILNIK B: CZAT & WIEDZA (SLM)
                  </span>
                  <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                    LOKALNY OFFLINE
                  </span>
                </div>
                <div className="font-bold text-white text-xs truncate">
                  {activeModel?.name || 'Qwen 2.5 1.5B Instruct'}
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Odpowiada na czacie i generuje odpowiedzi w trybie 100% Offline. Wybierz model poniżej.
                </p>
              </div>
            </div>
          </div>

          {/* TAB 1: Catalog */}
          {selectedTab === 'catalog' && (
            <div className="space-y-4">
              {/* Filter Chips & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj modeli (Qwen, Gemma, Phi, ONNX, MediaPipe)..."
                    className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddRepoForm(!showAddRepoForm)}
                  className="px-3 py-2 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-xs font-semibold text-[#00e5ff] border border-[#00e5ff]/30 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj z HuggingFace</span>
                </button>
              </div>

              {/* Architecture Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCatalogFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    catalogFilter === 'all'
                      ? 'bg-[#00e5ff] text-black font-bold'
                      : 'bg-[#151e2e] text-gray-400 hover:text-white'
                  }`}
                >
                  Wszystkie
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('qwen')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    catalogFilter === 'qwen'
                      ? 'bg-[#00e5ff] text-black font-bold'
                      : 'bg-[#151e2e] text-gray-400 hover:text-white'
                  }`}
                >
                  Qwen 2.5 (Zalecany do PL)
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('gemma')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    catalogFilter === 'gemma'
                      ? 'bg-[#00e5ff] text-black font-bold'
                      : 'bg-[#151e2e] text-gray-400 hover:text-white'
                  }`}
                >
                  Google Gemma 2 (MediaPipe)
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('phi')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    catalogFilter === 'phi'
                      ? 'bg-[#00e5ff] text-black font-bold'
                      : 'bg-[#151e2e] text-gray-400 hover:text-white'
                  }`}
                >
                  Microsoft Phi-3 (ONNX)
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('smollm')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    catalogFilter === 'smollm'
                      ? 'bg-[#00e5ff] text-black font-bold'
                      : 'bg-[#151e2e] text-gray-400 hover:text-white'
                  }`}
                >
                  SmolLM2 / Llama
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('light')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    catalogFilter === 'light'
                      ? 'bg-[#00e5ff] text-black font-bold'
                      : 'bg-[#151e2e] text-gray-400 hover:text-white'
                  }`}
                >
                  Lekkie (&lt; 500MB)
                </button>
              </div>

              {/* Add Custom HuggingFace Repo Form */}
              {showAddRepoForm && (
                <div className="bg-[#0d131e] border border-[#8b5cf6]/40 rounded-xl p-4 space-y-3 animate-fadeIn">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                    <span>Wprowadź identyfikator repozytorium HuggingFace Hub</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-gray-400 mb-1">Repozytorium HF (owner/model):</label>
                      <input
                        type="text"
                        value={customRepoInput}
                        onChange={(e) => setCustomRepoInput(e.target.value)}
                        placeholder="np. google/gemma-2-2b-it lub microsoft/Phi-3-mini-4k-instruct-onnx"
                        className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#8b5cf6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Szacowany rozmiar (MB):</label>
                      <input
                        type="number"
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        placeholder="850"
                        className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#8b5cf6]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddRepoForm(false)}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomRepo}
                      disabled={!customRepoInput.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-bold hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
                    >
                      Dodaj do katalogu
                    </button>
                  </div>
                </div>
              )}

              {/* Models List */}
              <div className="grid grid-cols-1 gap-3">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isActive={model.id === activeModelId}
                    downloadProgress={downloads[model.id]}
                    onDownload={handleDownload}
                    onCancelDownload={handleCancelDownload}
                    onActivate={handleActivate}
                    onDelete={handleDelete}
                    onBenchmark={() => handleRunBenchmark(model.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Installed */}
          {selectedTab === 'installed' && (
            <div className="space-y-4">
              {/* Storage Overview Bar */}
              <div className="bg-[#0a0e14] border border-[#2d3748] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5 text-[#10b981]" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Pamięć zajęta przez modele offline:</div>
                    <div className="text-base font-extrabold text-white">
                      {totalDiskUsedMB >= 1000
                        ? `${(totalDiskUsedMB / 1024).toFixed(2)} GB`
                        : `${totalDiskUsedMB.toFixed(1)} MB`}{' '}
                      <span className="text-xs font-normal text-gray-400">({installedModels.length} zainstalowane)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRunBenchmark(activeModelId)}
                    disabled={isBenchmarking || installedModels.length === 0}
                    className="w-full sm:w-auto py-2 px-3 bg-[#1e2638] hover:bg-[#2d3748] text-xs font-bold text-[#00e5ff] rounded-xl border border-[#00e5ff]/30 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 active:scale-[0.98]"
                  >
                    <Activity className={`w-4 h-4 shrink-0 ${isBenchmarking ? 'animate-spin' : ''}`} />
                    <span>{isBenchmarking ? 'Testowanie...' : 'Benchmark aktywnego'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTab('playground')}
                    className="w-full sm:w-auto py-2 px-3 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-xs font-bold text-[#10b981] rounded-xl border border-[#10b981]/40 flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <Terminal className="w-4 h-4 shrink-0" />
                    <span>Otwórz konsolę</span>
                  </button>
                </div>
              </div>

              {/* Benchmark Result Card */}
              {benchmarkResult && (
                <div className="bg-[#152033] border border-[#00e5ff]/50 rounded-2xl p-4 shadow-lg space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Wynik Benchmarku Kirin 980 / WebGPU: {benchmarkResult.modelName}</span>
                    </h4>
                    <span className="text-[10px] text-[#10b981] font-bold bg-[#10b981]/20 px-2 py-0.5 rounded">
                      ZWERYFIKOWANO
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="bg-[#0a0e14] p-2 rounded-xl">
                      <div className="text-[10px] text-gray-400">Czas odpowiedzi (TTFT)</div>
                      <div className="text-base font-extrabold text-[#00e5ff] mt-0.5">{benchmarkResult.latencyMs} ms</div>
                    </div>
                    <div className="bg-[#0a0e14] p-2 rounded-xl">
                      <div className="text-[10px] text-gray-400">Prędkość generacji</div>
                      <div className="text-base font-extrabold text-[#8b5cf6] mt-0.5">{benchmarkResult.tokensPerSecond} tok/s</div>
                    </div>
                    <div className="bg-[#0a0e14] p-2 rounded-xl">
                      <div className="text-[10px] text-gray-400">Użycie RAM</div>
                      <div className="text-base font-extrabold text-[#10b981] mt-0.5">~{benchmarkResult.ramUsageMB} MB</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 bg-[#0a0e14]/60 p-2.5 rounded-xl border border-white/5 mt-2 font-mono text-[11px]">
                    {benchmarkResult.testResponse}
                  </p>
                </div>
              )}

              {installedModels.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-[#0a0e14] border border-[#2d3748] text-gray-400 text-sm">
                  Brak zainstalowanych modeli offline. Przejdź do zakładki Katalog, aby pobrać model Gemma 2B lub Phi-3.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {installedModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isActive={model.id === activeModelId}
                      downloadProgress={downloads[model.id]}
                      onDownload={handleDownload}
                      onCancelDownload={handleCancelDownload}
                      onActivate={handleActivate}
                      onDelete={handleDelete}
                      onBenchmark={() => handleRunBenchmark(model.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Import from Local Device */}
          {selectedTab === 'import' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 transition-all ${
                  isDragging
                    ? 'border-[#00e5ff] bg-[#00e5ff]/10 scale-[0.99]'
                    : 'bg-[#0a0e14] border-[#00e5ff]/40 hover:border-[#00e5ff]'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#00e5ff]/15 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
                  <Upload className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Przeciągnij lub wczytaj plik wag z pamięci urządzenia
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Obsługiwane formaty: <b>.task / .bin</b> (MediaPipe Gemma 2B), <b>.onnx</b> (ONNX Runtime Phi-3), <b>.gguf</b> oraz <b>.tflite</b>.
                  </p>
                </div>

                <label className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs shadow-lg hover:opacity-95 transition-all cursor-pointer">
                  <span>Wybierz plik modelu z dysku</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".onnx,.bin,.task,.gguf,.tflite"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Supported Formats Info Guide */}
              <div className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 space-y-2 text-xs">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Przewodnik kompatybilności formatów na Kirin 980:</span>
                </h4>
                <ul className="space-y-1.5 text-gray-300 text-[11px] list-disc list-inside">
                  <li>
                    <b className="text-[#00e5ff]">MediaPipe GenAI (.task / .bin)</b>: Oficjalny kontener Google dla Gemma 2B zoptymalizowany dla akceleracji NPU i GPU Adreno/Mali.
                  </li>
                  <li>
                    <b className="text-[#00e5ff]">ONNX Runtime (.onnx)</b>: Zoptymalizowane kwantyzacje INT4/INT8 dla modeli Microsoft Phi-3, SmolLM2 oraz klasyfikatora wielointencyjnego GLiNER.
                  </li>
                  <li>
                    <b className="text-[#00e5ff]">GGUF / TFLite (.gguf / .tflite)</b>: Wagi kwantyzowane q4_k_m przystosowane do uruchamiania bez połączenia z siecią.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: Interactive Playground */}
          {selectedTab === 'playground' && (
            <div className="space-y-4">
              <div className="bg-[#0a0e14] border border-[#2d3748] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#10b981]" />
                    <span className="text-xs font-bold text-white">Aktywny silnik do testu:</span>
                    <span className="text-xs font-extrabold text-[#00e5ff] bg-[#00e5ff]/10 border border-[#00e5ff]/30 px-2 py-0.5 rounded-lg">
                      {activeModel.name} ({activeModel.format})
                    </span>
                  </div>

                  <span className="text-[11px] text-gray-400">
                    Kontekst: {activeModel.contextWindow} tokenów | Precyzja: {activeModel.precision}
                  </span>
                </div>

                {/* Preset Prompts */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] pt-1">
                  <span className="text-gray-400 shrink-0">Szybkie pytania:</span>
                  {[
                    'Wyjaśnij zalety kwantyzacji INT4',
                    'Wymień stolice Europy',
                    'Specyfikacja procesora Kirin 980',
                    'Podsumuj działanie asystenta offline'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPlaygroundPrompt(preset)}
                      className="px-2.5 py-1 bg-[#151e2e] hover:bg-[#1e2638] text-gray-300 hover:text-white rounded-lg border border-white/5 shrink-0 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Prompt Input */}
                <div className="relative">
                  <textarea
                    rows={3}
                    value={playgroundPrompt}
                    onChange={(e) => setPlaygroundPrompt(e.target.value)}
                    placeholder="Wpisz zapytanie do lokalnego modelu SLM..."
                    className="w-full bg-[#121824] border border-[#2d3748] focus:border-[#10b981] rounded-xl p-3 text-xs text-white outline-none resize-none leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleRunPlayground}
                    disabled={playgroundIsRunning || !playgroundPrompt.trim()}
                    className="absolute right-2.5 bottom-3 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md"
                  >
                    {playgroundIsRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generowanie...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Generuj odpowiedź</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Streaming Output Box */}
              <div className="bg-[#0a0e14] border border-[#2d3748] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${playgroundIsRunning ? 'bg-[#10b981] animate-ping' : 'bg-gray-500'}`} />
                    <span className="text-xs font-bold text-gray-300">Strumieniowanie tokenów (Offline Inference):</span>
                  </div>

                  {playgroundMetrics && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#00e5ff] font-mono">
                        TTFT: {playgroundMetrics.latencyMs} ms
                      </span>
                      <span className="text-[#8b5cf6] font-mono font-bold">
                        {playgroundMetrics.tokensPerSecond} tok/s
                      </span>
                      <span className="text-[#10b981] font-mono">
                        RAM: ~{playgroundMetrics.ramUsageMB} MB
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-h-[120px] font-mono text-xs leading-relaxed text-gray-200 whitespace-pre-wrap select-text bg-[#0d131e] p-3 rounded-xl border border-white/5">
                  {playgroundStreamingText || (
                    <span className="text-gray-500 italic">
                      Odpowiedź modelu pojawi się tutaj w czasie rzeczywistym...
                    </span>
                  )}
                </div>

                {playgroundMetrics && (
                  <div className="flex items-center justify-between text-[11px] bg-[#121824] px-3 py-2 rounded-xl border border-white/5 text-gray-400">
                    <span>Środowisko obliczeniowe: <b className="text-white">{playgroundMetrics.backend}</b></span>
                    <span>Wygenerowano <b className="text-[#10b981]">{playgroundMetrics.tokensCount}</b> tokenów</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#151e2e] border-t border-[#2d3748] p-3 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Aktywny model SLM:</span>
            <span className="font-bold text-[#00e5ff]">
              {activeModel.name}
            </span>
            <span className="bg-[#00e5ff]/20 text-[#00e5ff] text-[10px] px-1.5 py-0.5 rounded font-mono">
              {activeModel.precision}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1e2638] hover:bg-[#2d3748] text-white text-xs font-bold rounded-xl transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
