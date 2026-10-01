package com.example.telemetry

import com.example.data.model.KirinTelemetry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class TelemetryManager {

    private val _telemetry = MutableStateFlow(KirinTelemetry())
    val telemetry: StateFlow<KirinTelemetry> = _telemetry.asStateFlow()

    fun recordLocalInference(durationMs: Long, estimatedTokens: Int = 45) {
        _telemetry.update { current ->
            current.copy(
                lastLocalInferenceMs = durationMs,
                localQueriesHandled = current.localQueriesHandled + 1,
                totalSavedTokens = current.totalSavedTokens + estimatedTokens,
                savedDataKb = current.savedDataKb + (estimatedTokens * 4 / 1024 + 1)
            )
        }
    }

    fun recordCloudQuery() {
        _telemetry.update { current ->
            current.copy(cloudQueriesHandled = current.cloudQueriesHandled + 1)
        }
    }

    fun resetStats() {
        _telemetry.value = KirinTelemetry()
    }
}
