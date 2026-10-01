package com.example.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.CogniAgentApp
import com.example.automation.AgentAccessibilityService
import com.example.data.db.RoutineTriggerEntity
import com.example.data.db.SkillEntity
import com.example.data.model.ChatMessage
import com.example.data.model.HardwareState
import com.example.data.model.KirinTelemetry
import com.example.data.model.LlmSettings
import com.example.data.model.RoutineAction
import com.example.network.ApiMessage
import com.example.nlu.DownloadState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val tag = "MainViewModel"
    private val app = application as CogniAgentApp

    private val repository = app.repository
    private val hardwareManager = app.hardwareManager
    private val ttsManager = app.ttsManager
    private val speechRecognizer = app.speechRecognizerHelper
    private val routineExecutor = app.routineExecutor
    private val hybridAgentManager = app.hybridAgentManager
    private val modelDownloadManager = app.modelDownloadManager
    private val telemetryManager = app.telemetryManager

    val messages: StateFlow<List<ChatMessage>> = repository.messages.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val skills: StateFlow<List<SkillEntity>> = repository.skills.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val triggers: StateFlow<List<RoutineTriggerEntity>> = repository.triggers.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val hardwareState: StateFlow<HardwareState> = hardwareManager.hardwareState
    val telemetry: StateFlow<KirinTelemetry> = telemetryManager.telemetry
    val downloadState: StateFlow<DownloadState> = modelDownloadManager.downloadState

    private val _llmSettings = MutableStateFlow(
        LlmSettings(
            apiKey = "",
            endpointUrl = "https://openrouter.ai/api/v1/chat/completions",
            modelName = "meta-llama/llama-3.1-8b-instruct:free",
            speechRate = 1.0f,
            speechPitch = 1.0f,
            voiceLanguage = "pl_PL"
        )
    )
    val llmSettings: StateFlow<LlmSettings> = _llmSettings.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    val isListening: StateFlow<Boolean> = speechRecognizer.isListening
    val rmsLevel: StateFlow<Float> = speechRecognizer.rmsLevel
    val isSpeaking: StateFlow<Boolean> = ttsManager.isSpeaking
    val availableVoices: StateFlow<List<String>> = ttsManager.availableVoices

    private val _wakeWordActive = MutableStateFlow(false)
    val wakeWordActive: StateFlow<Boolean> = _wakeWordActive.asStateFlow()

    private val _testConnectionStatus = MutableStateFlow<String?>(null)
    val testConnectionStatus: StateFlow<String?> = _testConnectionStatus.asStateFlow()

    init {
        hardwareManager.updateState()
    }

    fun isNluModelInstalled(): Boolean = modelDownloadManager.isModelInstalled()

    fun getModelSizeMB(): Float = modelDownloadManager.getInstalledModelSizeMB()

    fun startModelDownload(onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            modelDownloadManager.downloadNluModel(onSuccess, onError)
        }
    }

    fun deleteNluModel(): Boolean = modelDownloadManager.deleteModel()

    fun toggleWakeWordListening(onError: (String) -> Unit) {
        if (_wakeWordActive.value) {
            _wakeWordActive.value = false
            speechRecognizer.stopListening()
            ttsManager.speak("Tryb nasłuchu słowa kluczowego wyłączony.")
        } else {
            _wakeWordActive.value = true
            ttsManager.speak("Tryb nasłuchu aktywny. Powiedz 'Hej Cogni' lub dowolne polecenie.")
            startWakeWordLoop(onError)
        }
    }

    private fun startWakeWordLoop(onError: (String) -> Unit) {
        if (!_wakeWordActive.value) return
        speechRecognizer.startListening(
            onResult = { recognizedText ->
                val lower = recognizedText.lowercase()
                val cleanedText = if (lower.contains("hej cogni") || lower.contains("cogni") || lower.contains("asystencie")) {
                    recognizedText
                        .replace("(?i)hej\\s+cogni".toRegex(), "")
                        .replace("(?i)cogni".toRegex(), "")
                        .replace("(?i)asystencie".toRegex(), "")
                        .trim()
                } else {
                    recognizedText
                }

                if (cleanedText.isNotBlank()) {
                    sendMessage(cleanedText)
                } else {
                    ttsManager.speak("Tak, słucham Cię.")
                }

                if (_wakeWordActive.value) {
                    startWakeWordLoop(onError)
                }
            },
            onError = { err ->
                if (_wakeWordActive.value) {
                    startWakeWordLoop(onError)
                } else {
                    onError(err)
                }
            }
        )
    }

    fun summarizeCurrentScreen() {
        viewModelScope.launch(Dispatchers.IO) {
            _isProcessing.value = true
            val service = AgentAccessibilityService.getInstance()
            if (service != null) {
                val screenText = service.extractScreenText()
                val prompt = "Podsumuj krótko w języku polskim zawartość z bieżącego ekranu użytkownika:\n\n$screenText"
                sendMessage(prompt)
            } else {
                val msg = "Aby przeanalizować ekran, włącz Usługę Dostępności CogniAgent w ustawieniach systemu."
                repository.addMessage(msg, isUser = false)
                ttsManager.speak(msg)
                _isProcessing.value = false
            }
        }
    }

    fun sendMessage(userText: String) {
        val trimmed = userText.trim()
        if (trimmed.isEmpty() || _isProcessing.value) return

        viewModelScope.launch(Dispatchers.IO) {
            _isProcessing.value = true
            repository.addMessage(trimmed, isUser = true)

            try {
                val currentHistory = messages.value.takeLast(6).map {
                    ApiMessage(
                        role = if (it.isUser) "user" else "assistant",
                        content = it.text
                    )
                }

                var toolSummaryReport: String? = null
                val (botResponse, toolSummary) = hybridAgentManager.processUserMessage(
                    userText = trimmed,
                    settings = _llmSettings.value,
                    history = currentHistory,
                    onToolExecuted = { toolReport ->
                        toolSummaryReport = toolReport
                    }
                )

                repository.addMessage(
                    text = botResponse,
                    isUser = false,
                    toolInvocation = toolSummary ?: toolSummaryReport
                )
            } catch (e: Exception) {
                Log.e(tag, "Error processing message: ${e.message}", e)
                val errMsg = "Błąd: ${e.localizedMessage ?: "Nieoczekiwany wyjątek"}"
                repository.addMessage(text = errMsg, isUser = false)
                ttsManager.speak(errMsg)
            } finally {
                _isProcessing.value = false
                hardwareManager.updateState()
            }
        }
    }

    fun startVoiceInput(onError: (String) -> Unit) {
        speechRecognizer.startListening(
            onResult = { recognizedText ->
                sendMessage(recognizedText)
            },
            onError = { error ->
                onError(error)
            }
        )
    }

    fun stopVoiceInput() {
        speechRecognizer.stopListening()
        _wakeWordActive.value = false
    }

    fun toggleTorch() {
        hardwareManager.toggleTorch()
    }

    fun toggleBluetooth() {
        val currentState = hardwareState.value.isBluetoothEnabled
        hardwareManager.setBluetooth(!currentState)
    }

    fun updateSettings(newSettings: LlmSettings) {
        _llmSettings.value = newSettings
        ttsManager.setSpeechRate(newSettings.speechRate)
        ttsManager.setSpeechPitch(newSettings.speechPitch)
    }

    fun testConnection() {
        viewModelScope.launch {
            _testConnectionStatus.value = "Sprawdzanie połączenia..."
            val result = hybridAgentManager.testConnection(_llmSettings.value)
            result.onSuccess { msg ->
                _testConnectionStatus.value = "✓ $msg"
                ttsManager.speak("Połączenie z serwerem zakończone sukcesem.")
            }.onFailure { err ->
                _testConnectionStatus.value = "✗ ${err.message}"
            }
        }
    }

    fun testVoiceSpeech() {
        ttsManager.speak("Dzień dobry! CogniAgent v2 jest gotowy do działania.")
    }

    fun saveSkill(name: String, actions: List<RoutineAction>) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.saveSkill(name, actions)
        }
    }

    fun updateSkill(id: Long, name: String, actions: List<RoutineAction>) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.updateSkill(id, name, actions)
        }
    }

    fun deleteSkill(id: Long) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.deleteSkill(id)
        }
    }

    fun executeSkill(skill: SkillEntity) {
        viewModelScope.launch(Dispatchers.Default) {
            routineExecutor.executeActionsJson(skill.actionsJson)
        }
    }

    fun saveTrigger(triggerType: String, skillName: String) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.saveTrigger(triggerType, skillName, enabled = true)
        }
    }

    fun toggleTrigger(trigger: RoutineTriggerEntity) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.updateTrigger(trigger.copy(enabled = !trigger.enabled))
        }
    }

    fun deleteTrigger(id: Long) {
        viewModelScope.launch(Dispatchers.IO) {
            repository.deleteTrigger(id)
        }
    }

    fun clearChat() {
        viewModelScope.launch(Dispatchers.IO) {
            repository.clearMessages()
        }
    }

    fun speakText(text: String) {
        ttsManager.speak(text)
    }

    fun exportRoutinesJson(): String {
        val currentSkills = skills.value.map {
            com.example.data.model.ExportedSkill(
                name = it.name,
                actionsJson = it.actionsJson,
                description = it.description
            )
        }
        val currentTriggers = triggers.value.map {
            com.example.data.model.ExportedTrigger(
                triggerType = it.triggerType,
                skillName = it.skillName,
                enabled = it.enabled
            )
        }
        val backup = com.example.data.model.RoutinesBackup(
            skills = currentSkills,
            triggers = currentTriggers
        )
        return kotlinx.serialization.json.Json { prettyPrint = true }.encodeToString(
            com.example.data.model.RoutinesBackup.serializer(),
            backup
        )
    }

    fun importRoutinesJson(jsonString: String, onComplete: (Result<Int>) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                val backup = json.decodeFromString<com.example.data.model.RoutinesBackup>(jsonString)
                var count = 0
                for (s in backup.skills) {
                    val actions = json.decodeFromString<List<RoutineAction>>(s.actionsJson)
                    repository.saveSkill(s.name, actions)
                    count++
                }
                for (t in backup.triggers) {
                    repository.saveTrigger(t.triggerType, t.skillName, t.enabled)
                }
                withContext(Dispatchers.Main) {
                    onComplete(Result.success(count))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onComplete(Result.failure(e))
                }
            }
        }
    }

    fun refreshHardwareState() {
        hardwareManager.updateState()
    }
}
