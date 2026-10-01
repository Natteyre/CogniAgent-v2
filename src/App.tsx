import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChatMessage,
  SkillEntity,
  RoutineTriggerEntity,
  HardwareState,
  LlmSettings,
  KirinTelemetry,
  DownloadState,
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

export const App: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getMessages());
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
  const [downloadState, setDownloadState] = useState<DownloadState>({ status: 'idle' });
  const [isNluModelInstalled, setIsNluModelInstalled] = useState<boolean>(() =>
    storage.isNluModelInstalled()
  );
  const [wakeWordActive, setWakeWordActive] = useState<boolean>(false);
  const [isFloatingActive, setIsFloatingActive] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [activeModelName, setActiveModelName] = useState<string>(() =>
    modelManager.getActiveModel()?.name || 'Kirin 980 NLU'
  );

  const wakeWordActiveRef = useRef(wakeWordActive);
  wakeWordActiveRef.current = wakeWordActive;

  // Subscriptions & Initializations
  useEffect(() => {
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
      unsubModels();
      unsubHw();
      unsubTriggers();
      unsubSpeaking();
      unsubVoices();
    };
  }, []);

  // Save messages changes
  useEffect(() => {
    storage.saveMessages(messages);
  }, [messages]);

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
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isProcessing) return;

      const userMsg: ChatMessage = {
        id: Date.now(),
        text: trimmed,
        isUser: true,
        timestamp: Date.now()
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
          trimmed,
          llmSettings,
          history,
          (report) => {
            toolSummaryReport = report;
          }
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
    speechRecognizerHelper.startListening(
      (transcript) => {
        handleSendMessage(transcript);
      },
      (error) => {
        console.warn('Voice input error:', error);
      }
    );
  };

  const handleStopVoice = () => {
    speechRecognizerHelper.stopListening();
    setWakeWordActive(false);
  };

  // Wake Word Continuous Loop
  const startWakeWordLoop = useCallback(() => {
    if (!wakeWordActiveRef.current) return;

    speechRecognizerHelper.startListening(
      (transcript) => {
        const lower = transcript.toLowerCase();
        let cleaned = transcript;
        if (
          lower.includes('hej cogni') ||
          lower.includes('cogni') ||
          lower.includes('asystencie')
        ) {
          cleaned = transcript
            .replace(/hej\s+cogni/gi, '')
            .replace(/cogni/gi, '')
            .replace(/asystencie/gi, '')
            .trim();
        }

        if (cleaned) {
          handleSendMessage(cleaned);
        } else {
          ttsManager.speak('Tak, słucham Cię.');
        }

        if (wakeWordActiveRef.current) {
          setTimeout(startWakeWordLoop, 1200);
        }
      },
      () => {
        if (wakeWordActiveRef.current) {
          setTimeout(startWakeWordLoop, 1500);
        }
      }
    );
  }, [handleSendMessage]);

  const handleToggleWakeWord = () => {
    if (wakeWordActive) {
      setWakeWordActive(false);
      speechRecognizerHelper.stopListening();
      ttsManager.speak('Tryb nasłuchu słowa kluczowego wyłączony.');
    } else {
      setWakeWordActive(true);
      ttsManager.speak("Tryb nasłuchu aktywny. Powiedz 'Hej Cogni' lub dowolne polecenie.");
      setTimeout(startWakeWordLoop, 500);
    }
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
  const handleSaveTrigger = (triggerType: string, skillName: string) => {
    const newTrigger: RoutineTriggerEntity = {
      id: Date.now(),
      triggerType,
      associatedSkillName: skillName,
      enabled: true
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

  // NLU Model Downloader Simulation
  const handleDownloadModel = () => {
    setDownloadState({
      status: 'downloading',
      currentFileName: 'gliner_static.onnx',
      progressPercent: 0,
      downloadedMB: 0,
      totalMB: 38.4
    });

    let current = 0;
    const interval = setInterval(() => {
      current += 15;
      if (current >= 100) {
        clearInterval(interval);
        setDownloadState({
          status: 'completed',
          message: 'Pobieranie zakończone! Model Kirin 980 NLU (38.4 MB) zainstalowany.'
        });
        setIsNluModelInstalled(true);
        storage.setNluModelInstalled(true);
      } else {
        setDownloadState({
          status: 'downloading',
          currentFileName: 'gliner_static.onnx',
          progressPercent: current,
          downloadedMB: Number(((current / 100) * 38.4).toFixed(1)),
          totalMB: 38.4
        });
      }
    }, 250);
  };

  const handleDeleteModel = () => {
    setIsNluModelInstalled(false);
    storage.setNluModelInstalled(false);
    setDownloadState({ status: 'idle' });
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
            onSendMessage={handleSendMessage}
            onStartVoice={handleStartVoice}
            onStopVoice={handleStopVoice}
            onToggleWakeWord={handleToggleWakeWord}
            onSummarizeScreen={handleSummarizeScreen}
            onToggleTorch={handleToggleTorch}
            onClearChat={handleClearChat}
            onSpeakMessage={handleSpeakMessage}
            onOpenModelManager={() => setIsModelModalOpen(true)}
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
            downloadState={downloadState}
            isNluModelInstalled={isNluModelInstalled}
            modelSizeMB={38.4}
            isFloatingActive={isFloatingActive}
            onUpdateSettings={handleUpdateSettings}
            onTestConnection={handleTestConnection}
            onTestVoiceSpeech={handleTestVoiceSpeech}
            onToggleTorch={handleToggleTorch}
            onToggleBluetooth={handleToggleBluetooth}
            onRefreshHardware={() => setHardwareState(hardwareManager.getState())}
            onDownloadModel={handleDownloadModel}
            onDeleteModel={handleDeleteModel}
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
    </div>
  );
};

export default App;
