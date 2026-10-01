package com.example.automation

import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.data.model.ActionType
import com.example.data.model.RoutineAction
import com.example.hardware.HardwareManager
import com.example.speech.TtsManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

class RoutineExecutor(
    private val context: Context,
    private val ttsManager: TtsManager,
    private val hardwareManager: HardwareManager
) {
    private val tag = "RoutineExecutor"
    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Executes a skill given its serialized JSON string of actions.
     */
    suspend fun executeActionsJson(actionsJson: String, onProgress: ((String) -> Unit)? = null) = withContext(Dispatchers.Default) {
        try {
            val actions = json.decodeFromString<List<RoutineAction>>(actionsJson)
            executeActions(actions, onProgress)
        } catch (e: Exception) {
            Log.e(tag, "Failed to parse and execute routine actions: ${e.message}", e)
            ttsManager.speak("Wystąpił błąd podczas wykonywania sekwencji rutyny.")
        }
    }

    /**
     * Executes sequential blocks of actions cleanly with delays and safety timeouts.
     */
    suspend fun executeActions(actions: List<RoutineAction>, onProgress: ((String) -> Unit)? = null) = withContext(Dispatchers.Default) {
        for ((index, action) in actions.withIndex()) {
            val logMsg = "Krok ${index + 1}/${actions.size}: ${action.type} -> ${action.parameter1}"
            Log.i(tag, logMsg)
            onProgress?.invoke(logMsg)

            when (action.type) {
                ActionType.SPEAK -> {
                    if (action.parameter1.isNotEmpty()) {
                        ttsManager.speak(action.parameter1)
                        // Allow brief speech buffer before next action
                        delay(600)
                    }
                }
                ActionType.OPEN_APP -> {
                    val pkg = action.parameter1.trim()
                    val accessibilityService = AgentAccessibilityService.getInstance()
                    val launched = accessibilityService?.launchApplication(pkg) ?: launchAppViaContext(pkg)
                    if (!launched) {
                        Log.w(tag, "Could not launch package: $pkg")
                    }
                }
                ActionType.DELAY -> {
                    val delayMs = action.parameter1.toLongOrNull() ?: 1000L
                    delay(delayMs.coerceIn(50L, 60000L))
                }
                ActionType.CLICK_NODE -> {
                    val targetText = action.parameter1.trim()
                    val accessibilityService = AgentAccessibilityService.getInstance()
                    if (accessibilityService != null) {
                        val success = accessibilityService.clickNodeByText(targetText)
                        if (!success) {
                            Log.w(tag, "Node with text '$targetText' not clicked.")
                        }
                    } else {
                        Log.w(tag, "Accessibility Service is not enabled, cannot click node '$targetText'")
                    }
                }
                ActionType.TOGGLE_HARDWARE -> {
                    val target = action.parameter1.trim().lowercase()
                    val state = action.parameter2.trim().lowercase()
                    val isEnable = state == "on" || state == "true" || state == "włącz" || state == "1"

                    when {
                        target.contains("torch") || target.contains("latark") || target.contains("diod") -> {
                            hardwareManager.setTorch(isEnable)
                        }
                        target.contains("bluetooth") || target.contains("bt") -> {
                            hardwareManager.setBluetooth(isEnable)
                        }
                    }
                }
                ActionType.SWIPE_SCREEN -> {
                    val direction = action.parameter1.lowercase().trim()
                    val accessibilityService = AgentAccessibilityService.getInstance()
                    if (accessibilityService != null) {
                        when (direction) {
                            "up", "góra" -> accessibilityService.dispatchSwipe(500f, 1500f, 500f, 500f, 300L)
                            "down", "dół", "dol" -> accessibilityService.dispatchSwipe(500f, 500f, 500f, 1500f, 300L)
                            "left", "lewo" -> accessibilityService.dispatchSwipe(900f, 1000f, 100f, 1000f, 300L)
                            "right", "prawo" -> accessibilityService.dispatchSwipe(100f, 1000f, 900f, 1000f, 300L)
                            else -> accessibilityService.dispatchSwipe(500f, 1200f, 500f, 600f, 300L)
                        }
                        delay(400)
                    }
                }
                ActionType.TAP_COORDINATE -> {
                    val coords = action.parameter1.split(",", " ", ";").mapNotNull { it.trim().toFloatOrNull() }
                    if (coords.size >= 2) {
                        val accessibilityService = AgentAccessibilityService.getInstance()
                        accessibilityService?.dispatchTap(coords[0], coords[1])
                        delay(300)
                    }
                }
                ActionType.SUMMARIZE_SCREEN -> {
                    val accessibilityService = AgentAccessibilityService.getInstance()
                    if (accessibilityService != null) {
                        val screenText = accessibilityService.extractScreenText()
                        val preview = screenText.lines().take(5).joinToString(". ")
                        ttsManager.speak("Podsumowanie ekranu: $preview")
                    } else {
                        ttsManager.speak("Włącz usługę dostępności, aby odczytać zawartość ekranu.")
                    }
                }
                ActionType.SET_TIMER -> {
                    val seconds = action.parameter1.toIntOrNull() ?: 300
                    val label = action.parameter2.ifBlank { "CogniAgent Minutnik" }
                    hardwareManager.setTimer(seconds, label)
                    ttsManager.speak("Ustawiono minutnik na ${seconds / 60} minut.")
                }
                ActionType.SET_ALARM -> {
                    val timeParts = action.parameter1.split(":", ".", "-")
                    val hour = timeParts.getOrNull(0)?.toIntOrNull() ?: 7
                    val min = timeParts.getOrNull(1)?.toIntOrNull() ?: (action.parameter2.toIntOrNull() ?: 0)
                    val label = action.parameter2.takeIf { it.toIntOrNull() == null } ?: "CogniAgent Budzik"
                    hardwareManager.setAlarm(hour, min, label)
                    ttsManager.speak("Ustawiono budzik na godzinę $hour:${min.toString().padStart(2, '0')}.")
                }
                ActionType.SET_VOLUME -> {
                    val vol = action.parameter1.toIntOrNull() ?: 50
                    hardwareManager.setDeviceVolume(vol)
                    ttsManager.speak("Ustawiono głośność na $vol procent.")
                }
            }
        }
    }

    private fun launchAppViaContext(packageName: String): Boolean {
        return try {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (intent != null) {
                context.startActivity(intent)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(tag, "launchAppViaContext failed: ${e.message}")
            false
        }
    }
}
