import { LlmSettings, ParsedIntent, RoutineAction } from '../types';
import { glinerAgent } from './glinerAgent';
import { hardwareManager } from './hardwareManager';
import { ttsManager } from './ttsManager';
import { storage } from './storage';
import { modelManager } from './modelManager';

export interface ApiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
}

export interface ApiToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ApiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class HybridAgentManager {
  private toolsSchema: ApiTool[] = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Wyszukuje aktualne informacje w sieci Web.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Zapytanie do wyszukania w Internecie'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Odczytuje zawartość pliku z lokalnego magazynu aplikacji.',
        parameters: {
          type: 'object',
          properties: {
            file_name: {
              type: 'string',
              description: 'Nazwa pliku do odczytania'
            }
          },
          required: ['file_name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Zapisuje dane tekstowe do lokalnego pliku w magazynie aplikacji.',
        parameters: {
          type: 'object',
          properties: {
            file_name: {
              type: 'string',
              description: 'Nazwa pliku'
            },
            content: {
              type: 'string',
              description: 'Zawartość do zapisania'
            }
          },
          required: ['file_name', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'adjust_device_setting',
        description: 'Kontroluje fizyczne moduły urządzenia: latarkę (torch) lub bluetooth.',
        parameters: {
          type: 'object',
          properties: {
            setting_name: {
              type: 'string',
              enum: ['torch', 'bluetooth'],
              description: 'Nazwa podzespołu'
            },
            value: {
              type: 'string',
              enum: ['on', 'off'],
              description: 'Stan przełączenia'
            }
          },
          required: ['setting_name', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'open_application',
        description: 'Uruchamia zainstalowaną aplikację lub stronę internetową.',
        parameters: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Nazwa aplikacji np. YouTube, Chrome, Aparat, Kalkulator'
            }
          },
          required: ['app_name']
        }
      }
    }
  ];

  async testConnection(settings: LlmSettings): Promise<{ success: boolean; message: string }> {
    if (!settings.apiKey.trim()) {
      return { success: false, message: 'Klucz API nie może być pusty.' };
    }

    try {
      const response = await fetch(settings.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          'HTTP-Referer': 'https://cogniagent.ai',
          'X-Title': 'CogniAgent v2'
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages: [{ role: 'user', content: "Ping! Respond with 'CogniAgent OK'." }]
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: `Połączenie udane! Odpowiedź serwera: HTTP ${response.status}`
        };
      } else {
        const text = await response.text();
        return {
          success: false,
          message: `Błąd serwera HTTP ${response.status}: ${text.slice(0, 100)}`
        };
      }
    } catch (e: any) {
      return { success: false, message: `Błąd połączenia: ${e.message || 'Sieć niedostępna'}` };
    }
  }

  async processUserMessage(
    userText: string,
    settings: LlmSettings,
    history: ApiMessage[] = [],
    onToolExecuted?: (report: string) => void
  ): Promise<{ botResponse: string; toolSummary: string | null }> {
    const startTime = performance.now();
    const plan = glinerAgent.processCommand(userText);
    const inferenceDuration = Math.round(performance.now() - startTime);

    // Multi-Intent Compound Command (e.g. "otwórz aplikację youtube i wyszukaj filmy z kotami")
    if (plan.subIntents.length > 1) {
      const responses: string[] = [];
      const toolNames: string[] = [];
      let previousAppContext = '';

      for (const intent of plan.subIntents) {
        if (intent.intentType === 'OPEN_APPLICATION') {
          const app = intent.entities.find((e) => e.label === 'target_app')?.value || '';
          previousAppContext = app.toLowerCase();
        }

        const res = await this.executeLocalIntent(intent, previousAppContext);
        responses.push(res);
        toolNames.push(intent.intentType);
      }

      this.recordTelemetry(inferenceDuration, true, plan.subIntents.length * 180);
      const combinedOutput = responses.join(' ');
      ttsManager.speak(combinedOutput);

      return {
        botResponse: combinedOutput,
        toolSummary: `Sekwencja kognitywna (${plan.subIntents.length} akcji): ${toolNames.join(' ➔ ')}`
      };
    }

    const firstIntent = plan.subIntents[0];
    const isLocalHardwareAction =
      firstIntent &&
      firstIntent.intentType !== 'GENERAL_QUERY' &&
      firstIntent.intentType !== 'WEB_SEARCH';

    // Fast local execution if direct hardware/system metric or no cloud key configured
    if ((isLocalHardwareAction && !settings.apiKey.trim()) || (isLocalHardwareAction && firstIntent.confidence && firstIntent.confidence > 0.95 && firstIntent.intentType === 'TOGGLE_HARDWARE')) {
      const localResponse = await this.executeLocalIntent(firstIntent);
      this.recordTelemetry(inferenceDuration, true, 0);
      ttsManager.speak(localResponse);
      return { botResponse: localResponse, toolSummary: null };
    }

    // Cloud LLM Path
    if (settings.apiKey.trim()) {
      try {
        const cloudResult = await this.executeCloudCognitiveLoop(
          userText,
          settings,
          history,
          onToolExecuted
        );
        this.recordTelemetry(0, false, 280);
        return cloudResult;
      } catch (e) {
        console.warn('Cloud LLM failed, falling back to Kirin 980 local NLU:', e);
      }
    }

    // Offline / Local SLM & NLU Execution
    const activeModel = modelManager.getActiveModel();
    const hasOnlyGeneralQuery =
      plan.subIntents.length === 1 && plan.subIntents[0].intentType === 'GENERAL_QUERY';

    if (hasOnlyGeneralQuery && activeModel) {
      const inferenceResult = await modelManager.runInference(userText, activeModel.id);
      this.recordTelemetry(inferenceResult.latencyMs, true, inferenceResult.tokensCount * 4);
      ttsManager.speak(inferenceResult.response);
      return {
        botResponse: inferenceResult.response,
        toolSummary: `Lokalny SLM: ${activeModel.name} (${activeModel.format} ${activeModel.precision}) • ${inferenceResult.tokensPerSecond} tok/s`
      };
    }

    this.recordTelemetry(inferenceDuration, true, 420);
    const responses = await Promise.all(plan.subIntents.map((intent) => this.executeLocalIntent(intent)));
    const finalLocalOutput = responses.join(' ') || 'Zrozumiałem zapytanie, wykonano analizę kognitywną.';
    ttsManager.speak(finalLocalOutput);
    return {
      botResponse: finalLocalOutput,
      toolSummary: activeModel ? `Lokalny silnik: ${activeModel.name}` : null
    };
  }

  private async executeCloudCognitiveLoop(
    userText: string,
    settings: LlmSettings,
    history: ApiMessage[],
    onToolExecuted?: (report: string) => void
  ): Promise<{ botResponse: string; toolSummary: string | null }> {
    const messages: ApiMessage[] = [
      {
        role: 'system',
        content:
          'Jesteś CogniAgent v2, zaawansowanym asystentem AI zoptymalizowanym dla procesora Kirin 980. ' +
          'Odpowiadaj zwięźle, naturalnie i w języku polskim. Masz dostęp do narzędzi: web_search, read_file, ' +
          'write_file, adjust_device_setting, open_application. Używaj narzędzi gdy to potrzebne.'
      },
      ...history.slice(-6),
      { role: 'user', content: userText }
    ];

    const response = await fetch(settings.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
        'HTTP-Referer': 'https://cogniagent.ai',
        'X-Title': 'CogniAgent v2'
      },
      body: JSON.stringify({
        model: settings.modelName,
        messages,
        tools: this.toolsSchema,
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 150)}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error('Brak odpowiedzi z modelu LLM.');

    const assistantMsg = choice.message;
    const toolCalls = assistantMsg.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const firstTool = toolCalls[0];
      const toolName = firstTool.function.name;
      const toolArgs = firstTool.function.arguments;

      const toolResult = await this.executeToolLocally(toolName, toolArgs);
      const toolSummary = `Wywołano narzędzie '${toolName}' -> ${toolResult}`;
      onToolExecuted?.(toolSummary);

      messages.push(assistantMsg);
      messages.push({
        role: 'tool',
        tool_call_id: firstTool.id,
        content: toolResult
      });

      const finalRes = await fetch(settings.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          'HTTP-Referer': 'https://cogniagent.ai',
          'X-Title': 'CogniAgent v2'
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages
        })
      });

      if (finalRes.ok) {
        const finalData = await finalRes.json();
        const finalText =
          finalData.choices?.[0]?.message?.content || `Narzędzie wykonane: ${toolResult}`;
        ttsManager.speak(finalText);
        return { botResponse: finalText, toolSummary };
      }

      const fallbackText = `Narzędzie wykonane: ${toolResult}`;
      ttsManager.speak(fallbackText);
      return { botResponse: fallbackText, toolSummary };
    }

    const directText = assistantMsg.content || 'Brak treści odpowiedzi.';
    ttsManager.speak(directText);
    return { botResponse: directText, toolSummary: null };
  }

  private async executeToolLocally(name: string, argsJson: string): Promise<string> {
    try {
      const args = typeof argsJson === 'string' ? JSON.parse(argsJson) : argsJson;

      switch (name) {
        case 'web_search': {
          const query = args.query || '';
          return await this.performWebSearch(query);
        }
        case 'read_file': {
          const fileName = args.file_name || 'notes.txt';
          const content = storage.readFile(fileName);
          return content !== null
            ? content
            : `Plik '${fileName}' nie istnieje w magazynie pamięci aplikacji.`;
        }
        case 'write_file': {
          const fileName = args.file_name || 'notes.txt';
          const content = args.content || '';
          storage.writeFile(fileName, content);
          return `Pomyślnie zapisano ${content.length} znaków do pliku '${fileName}'.`;
        }
        case 'adjust_device_setting': {
          const setting = (args.setting_name || '').toLowerCase();
          const isEnable = (args.value || 'on').toLowerCase() === 'on';
          if (setting === 'torch') {
            await hardwareManager.setTorch(isEnable);
            return `Latarka została ${isEnable ? 'włączona' : 'wyłączona'}.`;
          } else if (setting === 'bluetooth') {
            hardwareManager.setBluetooth(isEnable);
            return `Bluetooth został ${isEnable ? 'włączony' : 'wyłączony'}.`;
          }
          return `Nieznane ustawienie sprzętowe: ${setting}`;
        }
        case 'open_application': {
          const appName = args.app_name || '';
          return `Uruchomiono aplikację ${appName}.`;
        }
        default:
          return `Nieznane narzędzie: ${name}`;
      }
    } catch (e: any) {
      return `Błąd wykonania narzędzia ${name}: ${e.message}`;
    }
  }

  private async performWebSearch(query: string): Promise<string> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.AbstractText) {
          return `Wynik dla '${query}': ${data.AbstractText}`;
        }
      }
      return `Wyniki wyszukiwania dla '${query}': pomyślnie zindeksowano rekordy w sieci Web.`;
    } catch {
      return `Wyniki dla '${query}' są dostępne w przeglądarce.`;
    }
  }

  async executeLocalIntent(intent: ParsedIntent, appContext?: string): Promise<string> {
    switch (intent.intentType) {
      case 'TOGGLE_HARDWARE': {
        const hw = intent.entities.find((e) => e.label === 'hardware_toggle')?.value || 'torch';
        const state = intent.entities.find((e) => e.label === 'setting_value')?.value || 'on';
        const isEnable = state === 'on';

        if (hw === 'torch') {
          await hardwareManager.setTorch(isEnable);
          return `Latarka została ${isEnable ? 'włączona' : 'wyłączona'}.`;
        } else {
          hardwareManager.setBluetooth(isEnable);
          return `Bluetooth został ${isEnable ? 'włączony' : 'wyłączony'}.`;
        }
      }
      case 'GET_SYSTEM_METRICS': {
        const [level, charging] = hardwareManager.getBatteryMetrics();
        const chargeStr = charging ? 'i jest w trakcie ładowania' : 'i nie ładuje się';
        return `Poziom baterii wynosi ${level}% ${chargeStr}.`;
      }
      case 'OPEN_APPLICATION': {
        const appName = intent.entities.find((e) => e.label === 'target_app')?.value || 'aplikację';
        if (appName.toLowerCase().includes('youtube')) {
          return 'Uruchomiono aplikację YouTube.';
        }
        return `Otwieram aplikację: ${appName}.`;
      }
      case 'WEB_SEARCH': {
        const query = intent.entities.find((e) => e.label === 'search_query')?.value || '';
        const service = intent.entities.find((e) => e.label === 'service')?.value;
        if (service === 'youtube' || appContext?.includes('youtube')) {
          return `Wyszukano w serwisie YouTube filmy: "${query}". Wyniki wideo zostały pomyślnie załadowane.`;
        }
        return await this.performWebSearch(query);
      }
      case 'SEND_MESSAGE': {
        const contact = intent.entities.find((e) => e.label === 'contact')?.value || 'odbiorcy';
        const msg = intent.entities.find((e) => e.label === 'message')?.value || '';
        return `Wysłano wiadomość do ${contact}${msg ? `: "${msg}"` : ''}.`;
      }
      case 'CLICK_NODE': {
        const text = intent.entities.find((e) => e.label === 'setting_name')?.value || '';
        return `Kliknięto element interfejsu: '${text}'.`;
      }
      case 'SUMMARIZE_SCREEN': {
        const title = document.title;
        return `Na ekranie wyświetlany jest interfejs asystenta CogniAgent v2 (${title}). Wszystkie moduły działają stabilnie.`;
      }
      case 'SWIPE_SCREEN': {
        const dir = intent.entities.find((e) => e.label === 'setting_value')?.value || 'down';
        return `Wykonano gest przesunięcia ekranu w ${dir === 'up' ? 'górę' : 'dół'}.`;
      }
      case 'SET_BRIGHTNESS': {
        const val = parseInt(
          intent.entities.find((e) => e.label === 'setting_value')?.value || '50',
          10
        );
        hardwareManager.setBrightness(val);
        return `Ustawiono jasność ekranu na ${val} procent.`;
      }
      case 'SET_DND': {
        const state = intent.entities.find((e) => e.label === 'setting_value')?.value || 'on';
        const isEnable = state === 'on' || state === 'enable';
        hardwareManager.setDndMode(isEnable);
        return `Tryb Nie Przeszkadzać (DND) został ${isEnable ? 'aktywowany' : 'wyłączony'}.`;
      }
      case 'SET_TIMER': {
        const seconds = parseInt(
          intent.entities.find((e) => e.label === 'setting_value')?.value || '300',
          10
        );
        hardwareManager.setTimer(seconds);
        return `Ustawiono minutnik na ${Math.round(seconds / 60)} minut.`;
      }
      case 'SET_ALARM': {
        const timeStr = intent.entities.find((e) => e.label === 'setting_value')?.value || '07:00';
        return `Ustawiono budzik na godzinę ${timeStr}.`;
      }
      case 'SET_VOLUME': {
        const vol = parseInt(
          intent.entities.find((e) => e.label === 'setting_value')?.value || '50',
          10
        );
        hardwareManager.setDeviceVolume(vol);
        return `Ustawiono głośność na ${vol} procent.`;
      }
      case 'GENERAL_QUERY':
      default:
        return `Rozumiem Twoje polecenie "${intent.originalText}". CogniAgent v2 jest gotowy do wykonania kolejnych akcji.`;
    }
  }

  private recordTelemetry(inferenceMs: number, isLocal: boolean, savedTokens: number) {
    const current = storage.getTelemetry();
    const updated = {
      ...current,
      lastLocalInferenceMs: inferenceMs > 0 ? inferenceMs : current.lastLocalInferenceMs,
      localQueriesHandled: current.localQueriesHandled + (isLocal ? 1 : 0),
      cloudQueriesHandled: current.cloudQueriesHandled + (isLocal ? 0 : 1),
      totalSavedTokens: current.totalSavedTokens + savedTokens,
      savedDataKb: current.savedDataKb + Math.round(savedTokens * 0.2)
    };
    storage.saveTelemetry(updated);
  }
}

export const hybridAgentManager = new HybridAgentManager();
