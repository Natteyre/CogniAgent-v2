package com.example.speech

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import java.util.UUID

class TtsManager(private val context: Context) : TextToSpeech.OnInitListener {

    private val tag = "TtsManager"
    private var tts: TextToSpeech? = null
    private var isInitialized = false

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    private val _availableVoices = MutableStateFlow<List<String>>(emptyList())
    val availableVoices: StateFlow<List<String>> = _availableVoices.asStateFlow()

    private var currentRate = 1.0f
    private var currentPitch = 1.0f
    private var pendingSpeech: String? = null

    init {
        tts = TextToSpeech(context.applicationContext, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val polishLocale = Locale("pl", "PL")
            val result = tts?.setLanguage(polishLocale)

            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.w(tag, "Polish TTS not fully supported, falling back to default locale.")
                tts?.setLanguage(Locale.getDefault())
            } else {
                Log.i(tag, "Polish TTS initialized successfully.")
            }

            tts?.setSpeechRate(currentRate)
            tts?.setPitch(currentPitch)

            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    _isSpeaking.value = true
                }

                override fun onDone(utteranceId: String?) {
                    _isSpeaking.value = false
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    _isSpeaking.value = false
                }
            })

            // Populate voice engine options
            val voices = tts?.voices?.map { "${it.locale.displayLanguage} - ${it.name}" } ?: emptyList()
            _availableVoices.value = voices.ifEmpty { listOf("Domyślny głos systemu (Polski)") }

            isInitialized = true
            pendingSpeech?.let {
                speak(it)
                pendingSpeech = null
            }
        } else {
            Log.e(tag, "TTS Initialization failed with code $status")
        }
    }

    fun speak(text: String, onComplete: (() -> Unit)? = null) {
        if (!isInitialized) {
            pendingSpeech = text
            return
        }
        val utteranceId = UUID.randomUUID().toString()
        val params = Bundle().apply {
            putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
        }
        tts?.speak(text, TextToSpeech.QUEUE_ADD, params, utteranceId)
    }

    fun stop() {
        tts?.stop()
        _isSpeaking.value = false
    }

    fun setSpeechRate(rate: Float) {
        currentRate = rate.coerceIn(0.5f, 2.0f)
        tts?.setSpeechRate(currentRate)
    }

    fun setSpeechPitch(pitch: Float) {
        currentPitch = pitch.coerceIn(0.5f, 2.0f)
        tts?.setPitch(currentPitch)
    }

    fun shutdown() {
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (e: Exception) {
            Log.e(tag, "Error shutting down TTS: ${e.message}")
        }
    }
}
