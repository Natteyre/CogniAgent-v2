import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChatMessage,
  SkillEntity,
  RoutineTriggerEntity,
  HardwareState,
  LlmSettings,
  KirinTelemetry,
  RoutineAction,
  RoutinesBackup
} from './types';
import { storage } from './services/storage';
import { hardwareManager } from './services/hardwareManager';
import { ttsManager } from './services/ttsManager';
import { speechRecognizerHelper } from './services/speechRecognition';
import { hybridAgentManager } from './services/hybridAgentManager';
import { routineExecutor } from './services/routineExecutor';
import { ChatScreen } from './components/chat/ChatScreen';
import { RoutinesScreen } from './components/routines/RoutinesScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { BottomNavBar } from './components/navigation/BottomNavBar';
import { FloatingAssistantWidget } from './components/overlay/FloatingAssistantWidget';
import { modelManager } from './services/modelManager';
import { ModelManagerModal } from './components/models/ModelManagerModal';
import { sessionManager } from './services/sessionManager';
import { soundAndHaptics } from './services/soundAndHaptics';
import { ActionAuthorizationModal } from './components/security/ActionAuthorizationModal';
import { HandsFreeCarMode } from './components/handsfree/HandsFreeCarMode';
import { KnowledgeBaseModal } from './components/rag/KnowledgeBaseModal';
import { AndroidLauncherSimulator } from './components/simulator/AndroidLauncherSimulator';
import { AndroidAssistantModal } from './components/settings/AndroidAssistantModal';
import { LiveCameraVisionModal } from './components/vision/LiveCameraVisionModal';

export const App: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessionManager.getActiveSessionId());
  const [activeSessionTitle, setActiveSessionTitle] = useState<string>(
    () => sessionManager.getActiveSession()?.title || 'Główny asystent'
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    sessionManager.getMessages(sessionManager.getActiveSessionId())
  );
  const [skills, setSkills] = useState<SkillEntity[]>(() => storage.getSkills());
  const [triggers, setTriggers] = useState<RoutineTriggerEntity[]>(() => storage.getTriggers());
  const [hardwareState, setHardwareState] = useState<HardwareState>(() =>
    hardwareManager.getState()
  );
  const [llmSettings, setLlmSettings] = useState<LlmSettings>(() => storage.getSettings());
  const [telemetry, setTelemetry] = useState<KirinTelemetry>(() => storage.getTelemetry());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [rmsLevel, setRmsLevel] = useState<number>(0);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [testConnectionStatus, setTestConnectionStatus] = useState<string | null>(null);
  const [wakeWordActive, setWakeWordActive] = useState<boolean>(false);
  const [isStrictOffline, setIsStrictOffline] = useState<boolean>(() => storage.getStrictOfflineMode());
  const [isFloatingActive, setIsFloatingActive] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [isHandsFreeOpen, setIsHandsFreeOpen] = useState<boolean>(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [isLauncherSimulatorOpen, setIsLauncherSimulatorOpen] = useState<boolean>(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState<boolean>(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  const [activeModelName, setActiveModelName] = useState<string>(() =>
    modelManager.getActiveModel()?.name || 'Kirin 980 NLU'
  );

  const wakeWordActiveRef = useRef(wakeWordActive);
  wakeWordActiveRef.current = wakeWordActive;

  // Subscriptions & Initializations
  useEffect(() => {
    // Session Manager Subscription
    const unsubSessions = sessionManager.subscribe((sessions, actId) => {
      setActiveSessionId(actId);
      const active = sessions.find((s) => s.id === actId);
      if (active) setActiveSessionTitle(active.title);
    });

    // Model Manager Subscription
    const unsubModels = modelManager.subscribeModelList(() => {
      const active = modelManager.getActiveModel();
      if (active) setActiveModelName(active.name);
    });

    // Hardware State Subscription
    const unsubHw = hardwareManager.subscribe((state) => {
      setHardwareState(state);
    });

    // Hardware Event Trigger Subscription (e.g. Charger plugged in)
    const unsubTriggers = hardwareManager.subscribeTriggers((triggerType) => {
      const activeTriggers = storage.getTriggers();
      const matched = activeTriggers.filter((t) => t.triggerType === triggerType && t.enabled);
      const allSkills = storage.getSkills();

      matched.forEach((t) => {
        const skill = allSkills.find((s) => s.name === t.associatedSkillName);
        if (skill) {
          console.log(`Trigger fired: ${triggerType} -> running ${skill.name}`);
          soundAndHaptics.playSuccessChime();
          routineExecutor.executeActionsJson(skill.actionsJson);
        }
      });
    });

    // TTS Speaking state subscription
    const unsubSpeaking = ttsManager.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });

    // Voices subscription
    const unsubVoices = ttsManager.subscribeVoices((voices) => {
      setAvailableVoices(voices.map((v) => `${v.name} (${v.lang})`));
    });

    // STT Listeners
    speechRecognizerHelper.setListeners({
      onListeningChange: (listening) => setIsListening(listening),
      onRmsLevelChange: (rms) => setRmsLevel(rms)
    });

    return () => {
      unsubSessions();
      unsubModels();
      unsubHw();
      unsubTriggers();
      unsubSpeaking();
      unsubVoices();
    };
  }, []);

  // Save messages changes in active session
  useEffect(() => {
    sessionManager.saveMessages(activeSessionId, messages);
  }, [messages, activeSessionId]);

  const handleSwitchSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages(sessionManager.getMessages(sessionId));
    const s = sessionManager.getSessions().find((sess) => sess.id === sessionId);
    if (s) setActiveSessionTitle(s.title);
  };

  // Save skills changes
  useEffect(() => {
    storage.saveSkills(skills);
  }, [skills]);

  // Save triggers changes
  useEffect(() => {
    storage.saveTriggers(triggers);
  }, [triggers]);

  // Send Message implementation
  const handleSendMessage = useCallback(
    async (
      userText: string,
      attachment?: { image?: string; fileName?: string; fileSize?: string }
    ) => {
      const trimmed = userText.trim();
      if ((!trimmed && !attachment) || isProcessing) return;

      const effectiveText = trimmed || (attachment ? `[Przeanalizuj załącznik: ${attachment.fileName || 'plik'}]` : '');

      const userMsg: ChatMessage = {
        id: Date.now(),
        text: effectiveText,
        isUser: true,
        timestamp: Date.now(),
        attachedImage: attachment?.image,
        attachedFileName: attachment?.fileName,
        attachedFileSize: attachment?.fileSize
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsProcessing(true);

      try {
        const history = messages.slice(-6).map((m) => ({
          role: m.isUser ? ('user' as const) : ('assistant' as const),
          content: m.text
        }));

        let toolSummaryReport: string | null = null;
        const { botResponse, toolSummary } = await hybridAgentManager.processUserMessage(
          effectiveText,
          llmSettings,
          history,
          (report) => {
            toolSummaryReport = report;
          },
          attachment,
          isStrictOffline
        );

        const botMsg: ChatMessage = {
          id: Date.now() + 1,
          text: botResponse,
          isUser: false,
          timestamp: Date.now(),
          toolInvocation: toolSummary || toolSummaryReport
        };

        setMessages((prev) => [...prev, botMsg]);
        setTelemetry(storage.getTelemetry());
      } catch (err: any) {
        console.error('Error processing message:', err);
        const errMsg = `Błąd: ${err.message || 'Nieoczekiwany wyjątek'}`;
        const errorBotMsg: ChatMessage = {
          id: Date.now() + 1,
          text: errMsg,
          isUser: false,
          timestamp: Date.now(),
          isError: true
        };
        setMessages((prev) => [...prev, errorBotMsg]);
        ttsManager.speak(errMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, messages, llmSettings]
  );

  // Voice Input Handlers
  const handleStartVoice = () => {
    if (isListening) {
      handleStopVoice();
      return;
    }
    soundAndHaptics.playListeningStartChime();
    speechRecognizerHelper.startListening({
      continuous: false,
      onFinalResult: (transcript) => {
        if (transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      },
      onError: (error) => {
        console.warn('Voice input error:', error);
      }
    });
  };

  const handleStopVoice = () => {
    soundAndHaptics.playListeningPauseChime();
    speechRecognizerHelper.stopListening();
    setWakeWordActive(false);
  };

  // Wake Word Continuous Loop
  const startWakeWordLoop = useCallback(() => {
    if (!wakeWordActiveRef.current) return;

    speechRecognizerHelper.startListening({
      continuous: true,
      onFinalResult: (transcript) => {
        if (!transcript.trim()) return;

        const lower = transcript.toLowerCase();
        let cleaned = transcript;
        if (
          lower.includes('hej cogni') ||
          lower.includes('cogni') ||
          lower.includes('asystencie')
        ) {
          soundAndHaptics.playWakeWordChime();
          cleaned = transcript
            .replace(/hej\s+cogni/gi, '')
            .replace(/cogni/gi, '')
            .replace(/asystencie/gi, '')
            .trim();
        }

        if (cleaned) {
          handleSendMessage(cleaned);
        } else {
          soundAndHaptics.playWakeWordChime();
        }
      },
      onError: (err) => {
        console.warn('Wake word error:', err);
      }
    });
  }, [handleSendMessage]);

  const handleToggleWakeWord = () => {
    if (wakeWordActive) {
      setWakeWordActive(false);
      speechRecognizerHelper.stopListening();
      soundAndHaptics.playListeningPauseChime();
    } else {
      setWakeWordActive(true);
      soundAndHaptics.playListeningStartChime();
      startWakeWordLoop();
    }
  };

  const handleToggleStrictOffline = () => {
    const next = !isStrictOffline;
    setIsStrictOffline(next);
    storage.setStrictOfflineMode(next);
    soundAndHaptics.playSuccessChime();
  };

  // Screen summary
  const handleSummarizeScreen = () => {
    handleSendMessage('Co jest na ekranie?');
  };

  // Torch & Bluetooth toggles
  const handleToggleTorch = () => {
    hardwareManager.toggleTorch();
  };

  const handleToggleBluetooth = () => {
    hardwareManager.toggleBluetooth();
  };

  // Clear chat
  const handleClearChat = () => {
    const initial: ChatMessage[] = [
      {
        id: Date.now(),
        text: 'Wyczyszczono historię czatu. W czym mogę pomóc?',
        isUser: false,
        timestamp: Date.now()
      }
    ];
    setMessages(initial);
    storage.saveMessages(initial);
  };

  // Speak message
  const handleSpeakMessage = (text: string) => {
    ttsManager.speak(text);
  };

  // Skills CRUD
  const handleSaveSkill = (name: string, actions: RoutineAction[]) => {
    const newSkill: SkillEntity = {
      id: Date.now(),
      name,
      actionsJson: JSON.stringify(actions),
      createdAt: Date.now()
    };
    setSkills((prev) => [newSkill, ...prev]);
  };

  const handleDeleteSkill = (id: number) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const handleExecuteSkill = async (skill: SkillEntity) => {
    await routineExecutor.executeActionsJson(skill.actionsJson);
  };

  // Triggers CRUD
  const handleSaveTrigger = (
    triggerType: string,
    skillName: string,
    timeSchedule?: string,
    daysOfWeek?: string[],
    geofenceLocation?: string,
    bluetoothDeviceName?: string
  ) => {
    const newTrigger: RoutineTriggerEntity = {
      id: Date.now(),
      triggerType,
      associatedSkillName: skillName,
      enabled: true,
      timeSchedule,
      daysOfWeek,
      geofenceLocation,
      bluetoothDeviceName
    };
    setTriggers((prev) => [newTrigger, ...prev]);
  };

  const handleToggleTrigger = (trigger: RoutineTriggerEntity) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === trigger.id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleDeleteTrigger = (id: number) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
  };

  // Settings Handlers
  const handleUpdateSettings = (newSettings: LlmSettings) => {
    setLlmSettings(newSettings);
    storage.saveSettings(newSettings);
    ttsManager.setSpeechRate(newSettings.speechRate);
    ttsManager.setSpeechPitch(newSettings.speechPitch);
    if (newSettings.voiceLanguage) {
      ttsManager.setSelectedVoiceByName(newSettings.voiceLanguage);
    }
  };

  const handleTestConnection = async () => {
    setTestConnectionStatus('Sprawdzanie połączenia...');
    const result = await hybridAgentManager.testConnection(llmSettings);
    if (result.success) {
      setTestConnectionStatus(`✓ ${result.message}`);
      ttsManager.speak('Połączenie z serwerem zakończone sukcesem.');
    } else {
      setTestConnectionStatus(`✗ ${result.message}`);
    }
  };

  const handleTestVoiceSpeech = () => {
    ttsManager.speak('Dzień dobry! CogniAgent v2 jest gotowy do działania.');
  };

  // Export / Import Routines Backup JSON
  const handleExportRoutines = () => {
    const backup: RoutinesBackup = {
      version: 1,
      exportedAt: Date.now(),
      skills: skills.map((s) => ({
        name: s.name,
        actionsJson: s.actionsJson
      })),
      triggers: triggers.map((t) => ({
        triggerType: t.triggerType,
        skillName: t.associatedSkillName,
        enabled: t.enabled
      }))
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogniagent_routines_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRoutines = (jsonText: string) => {
    try {
      const parsed: RoutinesBackup = JSON.parse(jsonText);
      if (parsed.skills && Array.isArray(parsed.skills)) {
        const importedSkills: SkillEntity[] = parsed.skills.map((s, idx) => ({
          id: Date.now() + idx,
          name: s.name,
          actionsJson: s.actionsJson,
          createdAt: Date.now()
        }));
        setSkills((prev) => [...importedSkills, ...prev]);
      }
      if (parsed.triggers && Array.isArray(parsed.triggers)) {
        const importedTriggers: RoutineTriggerEntity[] = parsed.triggers.map((t, idx) => ({
          id: Date.now() + idx + 100,
          triggerType: t.triggerType,
          associatedSkillName: t.skillName,
          enabled: t.enabled ?? true
        }));
        setTriggers((prev) => [...importedTriggers, ...prev]);
      }
      ttsManager.speak('Pomyślnie zaimportowano definicje rutyn.');
    } catch {
      alert('Nieprawidłowy format JSON pliku kopii zapasowej.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0e14] text-[#f1f5f9] select-none font-sans overflow-hidden">
      {/* Screen Views */}
      <main className="flex-1 overflow-hidden relative">
        {selectedTab === 0 && (
          <ChatScreen
            messages={messages}
            hardwareState={hardwareState}
            isProcessing={isProcessing}
            isListening={isListening}
            isSpeaking={isSpeaking}
            wakeWordActive={wakeWordActive}
            rmsLevel={rmsLevel}
            activeModelName={activeModelName}
            activeSessionTitle={activeSessionTitle}
            isStrictOffline={isStrictOffline}
            onToggleStrictOffline={handleToggleStrictOffline}
            onSwitchSession={handleSwitchSession}
            onSendMessage={handleSendMessage}
            onStartVoice={handleStartVoice}
            onStopVoice={handleStopVoice}
            onToggleWakeWord={handleToggleWakeWord}
            onSummarizeScreen={handleSummarizeScreen}
            onToggleTorch={handleToggleTorch}
            onClearChat={handleClearChat}
            onSpeakMessage={handleSpeakMessage}
            onOpenModelManager={() => setIsModelModalOpen(true)}
            onOpenHandsFree={() => setIsHandsFreeOpen(true)}
            onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
            onOpenLauncherSimulator={() => setIsLauncherSimulatorOpen(true)}
            onOpenLiveCamera={() => setIsLiveCameraOpen(true)}
          />
        )}

        {selectedTab === 1 && (
          <RoutinesScreen
            skills={skills}
            triggers={triggers}
            onExecuteSkill={handleExecuteSkill}
            onSaveSkill={handleSaveSkill}
            onDeleteSkill={handleDeleteSkill}
            onSaveTrigger={handleSaveTrigger}
            onToggleTrigger={handleToggleTrigger}
            onDeleteTrigger={handleDeleteTrigger}
          />
        )}

        {selectedTab === 2 && (
          <SettingsScreen
            llmSettings={llmSettings}
            hardwareState={hardwareState}
            testConnectionStatus={testConnectionStatus}
            availableVoices={availableVoices}
            telemetry={telemetry}
            isFloatingActive={isFloatingActive}
            onUpdateSettings={handleUpdateSettings}
            onTestConnection={handleTestConnection}
            onTestVoiceSpeech={handleTestVoiceSpeech}
            onToggleTorch={handleToggleTorch}
            onToggleBluetooth={handleToggleBluetooth}
            onRefreshHardware={() => setHardwareState(hardwareManager.getState())}
            onToggleFloatingService={() => setIsFloatingActive(!isFloatingActive)}
            onToggleAccessibility={() => hardwareManager.toggleAccessibilityService()}
            onToggleNotifications={() => hardwareManager.toggleNotificationListener()}
            onExportRoutines={handleExportRoutines}
            onImportRoutines={handleImportRoutines}
          />
        )}
      </main>

      {/* Floating Head Overlay Assistant (like CogniFloatingService) */}
      <FloatingAssistantWidget
        isOpen={isFloatingActive}
        onClose={() => setIsFloatingActive(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar selectedTab={selectedTab} onSelectTab={setSelectedTab} />

      {/* Screen Brightness Dimming Overlay */}
      {hardwareState.brightnessPercent < 100 && (
        <div
          style={{ opacity: (100 - hardwareState.brightnessPercent) / 125 }}
          className="fixed inset-0 bg-black pointer-events-none z-[100] transition-opacity duration-300"
        />
      )}

      {/* Model Manager Modal (HuggingFace Hub / Local Device / Playground) */}
      <ModelManagerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onModelChanged={(model) => setActiveModelName(model.name)}
      />

      {/* Hands-Free Car & Walk Voice Mode */}
      <HandsFreeCarMode
        isOpen={isHandsFreeOpen}
        onClose={() => setIsHandsFreeOpen(false)}
        onSendMessage={handleSendMessage}
        lastUserText={messages.filter((m) => m.isUser).slice(-1)[0]?.text}
        lastBotReply={messages.filter((m) => !m.isUser).slice(-1)[0]?.text}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        rmsLevel={rmsLevel}
      />

      {/* Local Knowledge Base (Personal Offline RAG) */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        onAskQuestion={(question) => handleSendMessage(question)}
      />

      {/* Android Desktop Launcher Simulator (Floating Head Over Apps) */}
      <AndroidLauncherSimulator
        isOpen={isLauncherSimulatorOpen}
        onClose={() => setIsLauncherSimulatorOpen(false)}
        onSendMessage={handleSendMessage}
        lastResponse={messages.filter((m) => !m.isUser).slice(-1)[0]?.text}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        rmsLevel={rmsLevel}
        onOpenHandsFree={() => setIsHandsFreeOpen(true)}
        onOpenAssistantSetup={() => setIsAssistantModalOpen(true)}
      />

      {/* Android Default Assistant Setup & PiP Modal */}
      <AndroidAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        onLaunchPipMode={() => {
          setIsAssistantModalOpen(false);
          setIsLauncherSimulatorOpen(true);
        }}
      />

      {/* Real-Time Live Camera Vision (Gemini Live Vision) */}
      <LiveCameraVisionModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        rmsLevel={rmsLevel}
        onAnalyzeFrame={async (frameBase64, userQuery) => {
          const res = await hybridAgentManager.processUserMessage(
            userQuery,
            llmSettings,
            messages.map((m) => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.text
            })),
            undefined,
            {
              image: frameBase64,
              fileName: 'live_camera_feed.jpg',
              fileSize: '320 KB'
            }
          );
          return res.botResponse;
        }}
      />

      {/* Human-in-the-Loop Action Authorization Guardrail Modal */}
      <ActionAuthorizationModal />
    </div>
  );
};

export default App;
