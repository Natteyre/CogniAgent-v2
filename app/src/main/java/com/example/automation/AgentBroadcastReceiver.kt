package com.example.automation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log
import com.example.CogniAgentApp
import com.example.data.db.CogniDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AgentBroadcastReceiver : BroadcastReceiver() {

    private val tag = "AgentBroadcastReceiver"

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i(tag, "Received broadcast intent action: $action")

        // Secure processor execution stability for up to 15 seconds on Kirin 980
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "CogniAgent:BroadcastWakeLock"
        )
        wakeLock?.acquire(15000L) // 15 seconds safe execution timeout

        val pendingResult = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as? CogniAgentApp
                val ttsManager = app?.ttsManager
                val routineExecutor = app?.routineExecutor
                val db = CogniDatabase.getInstance(context)

                when (action) {
                    Intent.ACTION_POWER_CONNECTED -> {
                        Log.i(tag, "Power connected trigger detected.")
                        ttsManager?.speak("Ładowarka została podłączona. Sprawdzam zaplanowane procedury.")
                        handleActiveTriggers(db, "ACTION_POWER_CONNECTED", routineExecutor)
                    }
                    Intent.ACTION_POWER_DISCONNECTED -> {
                        Log.i(tag, "Power disconnected trigger detected.")
                        ttsManager?.speak("Odłączono zasilanie zewnętrzne.")
                        handleActiveTriggers(db, "ACTION_POWER_DISCONNECTED", routineExecutor)
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Error processing broadcast $action: ${e.message}", e)
            } finally {
                try {
                    if (wakeLock?.isHeld == true) {
                        wakeLock.release()
                    }
                } catch (e: Exception) {
                    Log.w(tag, "WakeLock release warning: ${e.message}")
                }
                pendingResult.finish()
            }
        }
    }

    private suspend fun handleActiveTriggers(
        db: CogniDatabase,
        triggerType: String,
        routineExecutor: RoutineExecutor?
    ) {
        val triggers = db.routineTriggerDao().getActiveTriggersByType(triggerType)
        for (trigger in triggers) {
            val skill = db.skillDao().getSkillByName(trigger.associatedSkillName)
            if (skill != null && routineExecutor != null) {
                Log.i(tag, "Executing routine skill: ${skill.name}")
                routineExecutor.executeActionsJson(skill.actionsJson)
            }
        }
    }
}
