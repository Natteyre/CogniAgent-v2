import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MessageSquare,
  DollarSign,
  Settings,
  Fingerprint,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { ActionConfirmationRequest, RiskLevel } from '../../types';
import { securityManager } from '../../services/securityManager';

export const ActionAuthorizationModal: React.FC = () => {
  const [request, setRequest] = useState<ActionConfirmationRequest | null>(null);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  useEffect(() => {
    return securityManager.subscribeConfirmation((req) => {
      setRequest(req);
      setIsBiometricScanning(false);
    });
  }, []);

  if (!request) return null;

  const handleApprove = () => {
    const policy = securityManager.getPolicy();
    if (policy.requireBiometricPrompt && request.riskLevel === 'CRITICAL') {
      setIsBiometricScanning(true);
      setTimeout(() => {
        setIsBiometricScanning(false);
        securityManager.resolveCurrentConfirmation(true);
      }, 700);
      return;
    }
    securityManager.resolveCurrentConfirmation(true);
  };

  const handleReject = () => {
    securityManager.resolveCurrentConfirmation(false);
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            RYZYKO KRYTYCZNE
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
            WYSOKIE RYZYKO
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
            ŚREDNIE RYZYKO
          </span>
        );
      default:
        return (
          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
            NISKIE RYZYKO
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'file':
        return <FileText className="w-5 h-5 text-amber-400" />;
      case 'communication':
        return <MessageSquare className="w-5 h-5 text-[#00e5ff]" />;
      case 'purchase':
        return <DollarSign className="w-5 h-5 text-red-400" />;
      case 'system':
        return <Settings className="w-5 h-5 text-rose-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-[#121824] border-2 border-red-500/40 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(239,68,68,0.25)] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-red-950/60 via-[#1a2233] to-red-950/60 p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Autoryzacja Akcji Agenta
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                Human-in-the-Loop Guardrail System
              </p>
            </div>
          </div>

          <div>{getRiskBadge(request.riskLevel)}</div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Action Title Card */}
          <div className="bg-[#0a0e14] p-3.5 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2.5">
              {getCategoryIcon(request.category)}
              <h4 className="text-sm font-bold text-white leading-snug">
                {request.actionTitle}
              </h4>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed pl-7">
              {request.riskReason}
            </p>
          </div>

          {/* Parameters Details Table */}
          {Object.keys(request.parameters).length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                Parametry operacji:
              </div>
              <div className="bg-[#0a0e14] p-3 rounded-2xl border border-white/5 space-y-1.5 text-xs font-mono">
                {Object.entries(request.parameters).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-[#00e5ff] font-semibold text-right break-all">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Original Voice/Text Command */}
          <div className="text-[11px] text-gray-400 bg-[#162030] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="truncate">Polecenie: „{request.commandText}”</span>
            <span className="shrink-0 flex items-center gap-1 font-mono text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />
              {new Date(request.timestamp).toLocaleTimeString('pl-PL')}
            </span>
          </div>

          {/* Biometric Scanning State if active */}
          {isBiometricScanning && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-2xl flex items-center justify-center gap-3 text-emerald-300 text-xs font-bold animate-pulse">
              <Fingerprint className="w-6 h-6 text-emerald-400 animate-spin" />
              <span>Weryfikacja biometryczna odcisku palca...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-[#0a0e14] p-4 border-t border-white/10 flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#1e2638] hover:bg-red-950/50 hover:text-red-300 text-gray-300 font-bold text-xs flex items-center justify-center gap-2 border border-white/5 transition-all"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Odrzuć / Zablokuj</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isBiometricScanning}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            <CheckCircle className="w-4 h-4 text-black" />
            <span>Zatwierdź i Wykonaj</span>
          </button>
        </div>
      </div>
    </div>
  );
};
