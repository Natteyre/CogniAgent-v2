package com.example.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ChatMessage(
    val id: Long = 0,
    val text: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val toolInvocation: String? = null,
    val isError: Boolean = false
)

@Serializable
data class ExtractedEntity(
    val label: String, // action, target_app, contact, message, setting_name, setting_value, hardware_toggle, search_query
    val value: String,
    val confidence: Float = 1.0f
)

@Serializable
data class ParsedIntent(
    val originalText: String,
    val intentType: String,
    val entities: List<ExtractedEntity> = emptyList(),
    val confidence: Float = 1.0f
)

@Serializable
data class MultiIntentPlan(
    val originalQuery: String,
    val subIntents: List<ParsedIntent>
)

@Serializable
enum class ActionType {
    SPEAK,
    OPEN_APP,
    DELAY,
    CLICK_NODE,
    TOGGLE_HARDWARE,
    SWIPE_SCREEN,
    TAP_COORDINATE,
    SUMMARIZE_SCREEN,
    SET_TIMER,
    SET_ALARM,
    SET_VOLUME
}

@Serializable
data class RoutineAction(
    val type: ActionType,
    val parameter1: String = "", // text to speak, packageName, delay in ms, node text, seconds/minutes, hour:min, or volume percent
    val parameter2: String = ""  // optional secondary param (e.g. label or minute)
)

@Serializable
data class ExportedSkill(
    val name: String,
    val actionsJson: String,
    val description: String = ""
)

@Serializable
data class ExportedTrigger(
    val triggerType: String,
    val skillName: String,
    val enabled: Boolean = true
)

@Serializable
data class RoutinesBackup(
    val version: Int = 1,
    val exportedAt: Long = System.currentTimeMillis(),
    val skills: List<ExportedSkill> = emptyList(),
    val triggers: List<ExportedTrigger> = emptyList()
)

@Serializable
data class KirinTelemetry(
    val lastLocalInferenceMs: Long = 0,
    val localQueriesHandled: Int = 0,
    val cloudQueriesHandled: Int = 0,
    val totalSavedTokens: Long = 0,
    val savedDataKb: Long = 0,
    val bigCoresActive: Int = 4
)

@Serializable
data class LlmSettings(
    val apiKey: String = "",
    val endpointUrl: String = "https://openrouter.ai/api/v1/chat/completions",
    val modelName: String = "meta-llama/llama-3.1-8b-instruct:free",
    val speechRate: Float = 1.0f,
    val speechPitch: Float = 1.0f,
    val voiceLanguage: String = "pl_PL"
)

@Serializable
data class HardwareState(
    val batteryPercent: Int = 100,
    val isCharging: Boolean = false,
    val isTorchOn: Boolean = false,
    val isBluetoothEnabled: Boolean = false,
    val isAccessibilityActive: Boolean = false,
    val isNotificationListenerActive: Boolean = false
)
