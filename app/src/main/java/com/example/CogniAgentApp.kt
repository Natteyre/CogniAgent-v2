package com.example

import android.app.Application
import android.util.Log
import com.example.automation.RoutineExecutor
import com.example.data.db.CogniDatabase
import com.example.data.repository.CogniRepository
import com.example.hardware.HardwareManager
import com.example.network.HybridAgentManager
import com.example.nlu.GlinerAgent
import com.example.nlu.ModelDownloadManager
import com.example.speech.SpeechRecognizerHelper
import com.example.speech.TtsManager
import com.example.telemetry.TelemetryManager

class CogniAgentApp : Application() {

    private val tag = "CogniAgentApp"

    val database: CogniDatabase by lazy { CogniDatabase.getInstance(this) }

    val repository: CogniRepository by lazy {
        CogniRepository(
            chatMessageDao = database.chatMessageDao(),
            skillDao = database.skillDao(),
            routineTriggerDao = database.routineTriggerDao()
        )
    }

    val glinerAgent: GlinerAgent by lazy { GlinerAgent(this) }
    val hardwareManager: HardwareManager by lazy { HardwareManager(this) }
    val ttsManager: TtsManager by lazy { TtsManager(this) }
    val speechRecognizerHelper: SpeechRecognizerHelper by lazy { SpeechRecognizerHelper(this) }
    val routineExecutor: RoutineExecutor by lazy { RoutineExecutor(this, ttsManager, hardwareManager) }
    val modelDownloadManager: ModelDownloadManager by lazy { ModelDownloadManager(this) }
    val telemetryManager: TelemetryManager by lazy { TelemetryManager() }

    val hybridAgentManager: HybridAgentManager by lazy {
        HybridAgentManager(this, glinerAgent, hardwareManager, ttsManager, telemetryManager)
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(tag, "CogniAgentApp started successfully.")
    }

    override fun onTerminate() {
        super.onTerminate()
        try {
            glinerAgent.close()
            ttsManager.shutdown()
        } catch (t: Throwable) {
            Log.e(tag, "onTerminate error: ${t.message}")
        }
    }
}
