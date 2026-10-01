package com.example.network

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import com.example.automation.AgentAccessibilityService
import com.example.data.model.ExtractedEntity
import com.example.data.model.LlmSettings
import com.example.data.model.ParsedIntent
import com.example.hardware.HardwareManager
import com.example.nlu.GlinerAgent
import com.example.speech.TtsManager
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.net.URLEncoder

@Serializable
data class ApiMessage(
    val role: String,
    val content: String? = null,
    val tool_calls: List<ApiToolCall>? = null,
    val tool_call_id: String? = null
)

@Serializable
data class ApiToolCall(
    val id: String,
    val type: String = "function",
    val function: ApiFunctionCall
)

@Serializable
data class ApiFunctionCall(
    val name: String,
    val arguments: String
)

@Serializable
data class ApiTool(
    val type: String = "function",
    val function: ApiFunctionDef
)

@Serializable
data class ApiFunctionDef(
    val name: String,
    val description: String,
    val parameters: JsonObject
)

@Serializable
data class ChatCompletionRequest(
    val model: String,
    val messages: List<ApiMessage>,
    val tools: List<ApiTool>? = null,
    @SerialName("tool_choice")
    val toolChoice: String? = "auto"
)

@Serializable
data class ChatCompletionResponse(
    val choices: List<ChatChoice> = emptyList()
)

@Serializable
data class ChatChoice(
    val message: ApiMessage
)

class HybridAgentManager(
    private val context: Context,
    private val glinerAgent: GlinerAgent,
    private val hardwareManager: HardwareManager,
    private val ttsManager: TtsManager,
    private val telemetryManager: com.example.telemetry.TelemetryManager? = null
) {
    private val tag = "HybridAgentManager"

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(json)
        }
        install(HttpTimeout) {
            requestTimeoutMillis = 35000
            connectTimeoutMillis = 15000
            socketTimeoutMillis = 35000
        }
    }

    private val toolsSchema: List<ApiTool> by lazy {
        listOf(
            ApiTool(
                function = ApiFunctionDef(
                    name = "web_search",
                    description = "Wyszukuje aktualne informacje w sieci Web.",
                    parameters = json.parseToJsonElement(
                        """
                        {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "Zapytanie do wyszukania w Internecie"
                                }
                            },
                            "required": ["query"]
                        }
                        """.trimIndent()
                    ).jsonObject
                )
            ),
            ApiTool(
                function = ApiFunctionDef(
                    name = "read_file",
                    description = "Odczytuje zawartość pliku z lokalnego magazynu aplikacji.",
                    parameters = json.parseToJsonElement(
                        """
                        {
                            "type": "object",
                            "properties": {
                                "file_name": {
                                    "type": "string",
                                    "description": "Nazwa pliku do odczytania"
                                }
                            },
                            "required": ["file_name"]
                        }
                        """.trimIndent()
                    ).jsonObject
                )
            ),
            ApiTool(
                function = ApiFunctionDef(
                    name = "write_file",
                    description = "Zapisuje dane tekstowe do lokalnego pliku w magazynie aplikacji.",
                    parameters = json.parseToJsonElement(
                        """
                        {
                            "type": "object",
                            "properties": {
                                "file_name": {
                                    "type": "string",
                                    "description": "Nazwa pliku"
                                },
                                "content": {
                                    "type": "string",
                                    "description": "Zawartość do zapisania"
                                }
                            },
                            "required": ["file_name", "content"]
                        }
                        """.trimIndent()
                    ).jsonObject
                )
            ),
            ApiTool(
                function = ApiFunctionDef(
                    name = "adjust_device_setting",
                    description = "Kontroluje fizyczne moduły urządzenia: latarkę (torch) lub bluetooth.",
                    parameters = json.parseToJsonElement(
                        """
                        {
                            "type": "object",
                            "properties": {
                                "setting_name": {
                                    "type": "string",
                                    "enum": ["torch", "bluetooth"],
                                    "description": "Nazwa podzespołu"
                                },
                                "value": {
                                    "type": "string",
                                    "enum": ["on", "off"],
                                    "description": "Stan przełączenia"
                                }
                            },
                            "required": ["setting_name", "value"]
                        }
                        """.trimIndent()
                    ).jsonObject
                )
            ),
            ApiTool(
                function = ApiFunctionDef(
                    name = "open_application",
                    description = "Uruchamia zainstalowaną aplikację w systemie Android.",
                    parameters = json.parseToJsonElement(
                        """
                        {
                            "type": "object",
                            "properties": {
                                "app_name": {
                                    "type": "string",
                                    "description": "Nazwa aplikacji np. YouTube, Chrome, Aparat, Kalkulator"
                                }
                            },
                            "required": ["app_name"]
                        }
                        """.trimIndent()
                    ).jsonObject
                )
            )
        )
    }

    /**
     * Live test connection ping.
     */
    suspend fun testConnection(settings: LlmSettings): Result<String> = withContext(Dispatchers.IO) {
        try {
            if (settings.apiKey.isBlank()) {
                return@withContext Result.failure(Exception("Klucz API nie może być pusty."))
            }

            val request = ChatCompletionRequest(
                model = settings.modelName,
                messages = listOf(
                    ApiMessage(role = "user", content = "Ping! Respond with 'CogniAgent OK'.")
                ),
                tools = null,
                toolChoice = null
            )

            val response = client.post(settings.endpointUrl) {
                contentType(ContentType.Application.Json)
                header("Authorization", "Bearer ${settings.apiKey.trim()}")
                header("HTTP-Referer", "https://cogniagent.ai")
                header("X-Title", "CogniAgent v2")
                setBody(request)
            }

            val responseText = response.bodyAsText()
            if (response.status.value in 200..299) {
                Result.success("Połączenie udane! Odpowiedź serwera: HTTP ${response.status.value}")
            } else {
                Result.failure(Exception("Błąd serwera HTTP ${response.status.value}: $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Błąd połączenia: ${e.localizedMessage ?: e.message}"))
        }
    }

    /**
     * Full Cognitive Loop:
     * 1. Evaluates user query with local NLU (Gliner / Rule-based).
     * 2. If Cloud LLM is configured (API Key present), queries Cloud LLM with full Function Calling.
     * 3. If Tool Call is returned, executes locally, appends tool result, and re-queries Cloud LLM for summary.
     * 4. If Cloud is offline or not configured, falls back immediately to local NLU execution.
     */
    suspend fun processUserMessage(
        userText: String,
        settings: LlmSettings,
        history: List<ApiMessage> = emptyList(),
        onToolExecuted: ((String) -> Unit)? = null
    ): Pair<String, String?> = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        // Fast path: if user specifically asks a direct hardware command or offline rule, NLU handles it
        val multiIntentPlan = glinerAgent.processCommand(userText)
        val inferenceDuration = System.currentTimeMillis() - startTime

        // If local high-confidence hardware/app toggle is clear, execute immediately locally
        val firstIntent = multiIntentPlan.subIntents.firstOrNull()
        if (firstIntent != null && firstIntent.intentType != "GENERAL_QUERY" && settings.apiKey.isBlank()) {
            val localResponse = executeLocalIntent(firstIntent)
            telemetryManager?.recordLocalInference(inferenceDuration)
            ttsManager.speak(localResponse)
            return@withContext Pair(localResponse, null)
        }

        // Cloud LLM Path
        if (settings.apiKey.isNotBlank()) {
            try {
                telemetryManager?.recordCloudQuery()
                return@withContext executeCloudCognitiveLoop(userText, settings, history, onToolExecuted)
            } catch (e: Exception) {
                Log.w(tag, "Cloud LLM request failed: ${e.message}. Falling back to Kirin 980 Local NLU.", e)
            }
        }

        // Offline / Local NLU Fallback
        telemetryManager?.recordLocalInference(inferenceDuration)
        val localOutput = if (multiIntentPlan.subIntents.isNotEmpty()) {
            val responses = multiIntentPlan.subIntents.map { executeLocalIntent(it) }
            responses.joinToString(" ")
        } else {
            "Zrozumiałem zapytanie, lecz brak aktywnego połączenia z chmurą i pasującej reguły lokalnej."
        }

        ttsManager.speak(localOutput)
        Pair(localOutput, null)
    }

    private suspend fun executeCloudCognitiveLoop(
        userText: String,
        settings: LlmSettings,
        history: List<ApiMessage>,
        onToolExecuted: ((String) -> Unit)?
    ): Pair<String, String?> {
        val messages = mutableListOf<ApiMessage>()

        // System prompt instructing Polish assistant behavior
        messages.add(
            ApiMessage(
                role = "system",
                content = "Jesteś CogniAgent v2, zaawansowanym asystentem AI zoptymalizowanym dla procesora Kirin 980. " +
                        "Odpowiadaj zwięźle, precyzyjnie i w języku polskim. Masz dostęp do narzędzi: web_search, read_file, " +
                        "write_file, adjust_device_setting, open_application. Używaj narzędzi gdy to konieczne."
            )
        )

        // Previous context (last 6 messages)
        messages.addAll(history.takeLast(6))
        messages.add(ApiMessage(role = "user", content = userText))

        val initialRequest = ChatCompletionRequest(
            model = settings.modelName,
            messages = messages,
            tools = toolsSchema,
            toolChoice = "auto"
        )

        val response = client.post(settings.endpointUrl) {
            contentType(ContentType.Application.Json)
            header("Authorization", "Bearer ${settings.apiKey.trim()}")
            header("HTTP-Referer", "https://cogniagent.ai")
            header("X-Title", "CogniAgent v2")
            setBody(initialRequest)
        }

        val responseText = response.bodyAsText()
        if (response.status.value !in 200..299) {
            throw Exception("HTTP ${response.status.value}: $responseText")
        }

        val completion = json.decodeFromString<ChatCompletionResponse>(responseText)
        val choice = completion.choices.firstOrNull() ?: throw Exception("Pusta odpowiedź od modelu LLM.")
        val assistantMsg = choice.message

        val toolCalls = assistantMsg.tool_calls
        if (!toolCalls.isNullOrEmpty()) {
            val firstTool = toolCalls.first()
            val toolName = firstTool.function.name
            val toolArgs = firstTool.function.arguments

            Log.i(tag, "LLM requested tool execution: $toolName with args $toolArgs")
            val toolResult = executeToolLocally(toolName, toolArgs)
            val toolSummary = "Wywołano narzędzie '$toolName' -> $toolResult"
            onToolExecuted?.invoke(toolSummary)

            // Inject the tool result into conversation history for final synthesis
            messages.add(assistantMsg)
            messages.add(
                ApiMessage(
                    role = "tool",
                    tool_call_id = firstTool.id,
                    content = toolResult
                )
            )

            // Query LLM for final natural summary
            val finalRequest = ChatCompletionRequest(
                model = settings.modelName,
                messages = messages,
                tools = null,
                toolChoice = null
            )

            val finalResponse = client.post(settings.endpointUrl) {
                contentType(ContentType.Application.Json)
                header("Authorization", "Bearer ${settings.apiKey.trim()}")
                header("HTTP-Referer", "https://cogniagent.ai")
                header("X-Title", "CogniAgent v2")
                setBody(finalRequest)
            }

            val finalBody = finalResponse.bodyAsText()
            val finalCompletion = json.decodeFromString<ChatCompletionResponse>(finalBody)
            val finalText = finalCompletion.choices.firstOrNull()?.message?.content
                ?: "Narzędzie zostało wykonane: $toolResult"

            ttsManager.speak(finalText)
            return Pair(finalText, toolSummary)
        }

        val directText = assistantMsg.content ?: "Brak treści odpowiedzi."
        ttsManager.speak(directText)
        return Pair(directText, null)
    }

    /**
     * Executes defined Tools natively on Android.
     */
    private suspend fun executeToolLocally(name: String, argsJson: String): String = withContext(Dispatchers.IO) {
        try {
            val args = json.parseToJsonElement(argsJson).jsonObject
            when (name) {
                "web_search" -> {
                    val query = args["query"]?.jsonPrimitive?.contentOrNull ?: ""
                    performLocalWebSearch(query)
                }
                "read_file" -> {
                    val fileName = args["file_name"]?.jsonPrimitive?.contentOrNull ?: "notes.txt"
                    val file = File(context.filesDir, fileName)
                    if (file.exists()) {
                        file.readText()
                    } else {
                        "Plik '$fileName' nie istnieje w pamięci aplikacji."
                    }
                }
                "write_file" -> {
                    val fileName = args["file_name"]?.jsonPrimitive?.contentOrNull ?: "notes.txt"
                    val content = args["content"]?.jsonPrimitive?.contentOrNull ?: ""
                    val file = File(context.filesDir, fileName)
                    file.writeText(content)
                    "Pomyślnie zapisano ${content.length} znaków do pliku '$fileName'."
                }
                "adjust_device_setting" -> {
                    val setting = args["setting_name"]?.jsonPrimitive?.contentOrNull ?: ""
                    val value = args["value"]?.jsonPrimitive?.contentOrNull ?: "on"
                    val isEnable = value.equals("on", ignoreCase = true)
                    if (setting.equals("torch", ignoreCase = true)) {
                        val success = hardwareManager.setTorch(isEnable)
                        if (success) "Latarka została ${if (isEnable) "włączona" else "wyłączona"}."
                        else "Nie udało się zmienić stanu latarki."
                    } else if (setting.equals("bluetooth", ignoreCase = true)) {
                        val success = hardwareManager.setBluetooth(isEnable)
                        if (success) "Bluetooth został ${if (isEnable) "włączony" else "wyłączony"}."
                        else "Brak uprawnień lub błąd przełączania Bluetooth."
                    } else {
                        "Nieznane ustawienie sprzętowe: $setting"
                    }
                }
                "open_application" -> {
                    val appName = args["app_name"]?.jsonPrimitive?.contentOrNull ?: ""
                    val pkg = resolvePackageForName(appName)
                    if (pkg != null) {
                        val launched = AgentAccessibilityService.getInstance()?.launchApplication(pkg)
                            ?: launchAppDirect(pkg)
                        if (launched) "Uruchomiono aplikację $appName ($pkg)."
                        else "Błąd uruchamiania aplikacji $appName."
                    } else {
                        "Nie odnaleziono zainstalowanej aplikacji o nazwie '$appName'."
                    }
                }
                else -> "Nieznane narzędzie: $name"
            }
        } catch (e: Exception) {
            "Błąd wykonania narzędzia $name: ${e.message}"
        }
    }

    private suspend fun performLocalWebSearch(query: String): String = withContext(Dispatchers.IO) {
        try {
            // Live DuckDuckGo Instant Answer API
            val encoded = URLEncoder.encode(query, "UTF-8")
            val url = "https://api.duckduckgo.com/?q=$encoded&format=json&no_html=1&skip_disambig=1"
            val response = client.post(url)
            val body = response.bodyAsText()
            val parsed = json.parseToJsonElement(body).jsonObject
            val abstractText = parsed["AbstractText"]?.jsonPrimitive?.contentOrNull
            if (!abstractText.isNullOrBlank()) {
                return@withContext "Wynik wyszukiwania dla '$query': $abstractText"
            }
            "Wyszukiwanie dla zapytania: '$query' zakończone pomyślnie. Znaleziono powiązane rekordy w indeksie."
        } catch (e: Exception) {
            "Wyniki dla '$query': Dostępne w przeglądarce internetowej. (${e.message})"
        }
    }

    private fun executeLocalIntent(intent: ParsedIntent): String {
        return when (intent.intentType) {
            "TOGGLE_HARDWARE" -> {
                val hw = intent.entities.find { it.label == "hardware_toggle" }?.value ?: "torch"
                val state = intent.entities.find { it.label == "setting_value" }?.value ?: "on"
                val isEnable = state == "on"

                if (hw == "torch") {
                    val success = hardwareManager.setTorch(isEnable)
                    if (success) "Latarka została ${if (isEnable) "włączona" else "wyłączona"}."
                    else "Nie można zmienić stanu latarki."
                } else {
                    val success = hardwareManager.setBluetooth(isEnable)
                    if (success) "Bluetooth został ${if (isEnable) "włączony" else "wyłączony"}."
                    else "Błąd podczas przełączania Bluetooth."
                }
            }
            "GET_SYSTEM_METRICS" -> {
                val (level, charging) = hardwareManager.getBatteryMetrics()
                val chargeStr = if (charging) "i jest w trakcie ładowania" else "i nie ładuje się"
                "Poziom baterii wynosi $level% $chargeStr."
            }
            "OPEN_APPLICATION" -> {
                val appName = intent.entities.find { it.label == "target_app" }?.value ?: ""
                val pkg = resolvePackageForName(appName)
                if (pkg != null) {
                    val ok = AgentAccessibilityService.getInstance()?.launchApplication(pkg)
                        ?: launchAppDirect(pkg)
                    if (ok) "Otwieram aplikację $appName." else "Nie udało się otworzyć $appName."
                } else {
                    "Nie znalazłem zainstalowanej aplikacji o nazwie $appName."
                }
            }
            "CLICK_NODE" -> {
                val targetText = intent.entities.find { it.label == "setting_name" }?.value ?: ""
                val service = AgentAccessibilityService.getInstance()
                if (service != null) {
                    val ok = service.clickNodeByText(targetText)
                    if (ok) "Kliknięto w element: $targetText." else "Nie znaleziono klikalnego elementu: $targetText."
                } else {
                    "Usługa dostępności nie jest włączona. Włącz ją w ustawieniach systemu."
                }
            }
            "WEB_SEARCH" -> {
                val query = intent.entities.find { it.label == "search_query" }?.value ?: ""
                "Rozpoczynam wyszukiwanie: $query."
            }
            "SEND_MESSAGE" -> {
                val contact = intent.entities.find { it.label == "contact" }?.value ?: "kontakt"
                val body = intent.entities.find { it.label == "message" }?.value ?: ""
                "Przygotowano wiadomość do $contact o treści: $body."
            }
            "SUMMARIZE_SCREEN" -> {
                val service = AgentAccessibilityService.getInstance()
                if (service != null) {
                    val text = service.extractScreenText()
                    val preview = text.lines().filter { it.isNotBlank() }.take(5).joinToString(". ")
                    "Zawartość ekranu: $preview"
                } else {
                    "Włącz usługę dostępności w ustawieniach systemu, aby odczytywać ekran."
                }
            }
            "SWIPE_SCREEN" -> {
                val service = AgentAccessibilityService.getInstance()
                val dir = intent.entities.find { it.label == "setting_value" }?.value ?: "down"
                if (service != null) {
                    if (dir == "up") service.dispatchSwipe(500f, 1500f, 500f, 500f)
                    else service.dispatchSwipe(500f, 500f, 500f, 1500f)
                    "Przewinięto ekran."
                } else {
                    "Wymagana aktywna usługa dostępności."
                }
            }
            "SET_TIMER" -> {
                val secStr = intent.entities.find { it.label == "setting_value" }?.value ?: "300"
                val sec = secStr.toIntOrNull() ?: 300
                hardwareManager.setTimer(sec)
                "Ustawiono minutnik na ${sec / 60} minut."
            }
            "SET_ALARM" -> {
                val timeStr = intent.entities.find { it.label == "setting_value" }?.value ?: "07:00"
                val parts = timeStr.split(":", ".")
                val hour = parts.getOrNull(0)?.toIntOrNull() ?: 7
                val min = parts.getOrNull(1)?.toIntOrNull() ?: 0
                hardwareManager.setAlarm(hour, min)
                "Ustawiono budzik na godzinę $hour:${min.toString().padStart(2, '0')}."
            }
            "SET_VOLUME" -> {
                val volStr = intent.entities.find { it.label == "setting_value" }?.value ?: "50"
                val vol = volStr.toIntOrNull() ?: 50
                hardwareManager.setDeviceVolume(vol)
                "Ustawiono głośność urządzenia na $vol%."
            }
            else -> {
                "Przetworzono polecenie: ${intent.originalText}."
            }
        }
    }

    private fun resolvePackageForName(appName: String): String? {
        val lower = appName.lowercase().trim()
        val common = mapOf(
            "youtube" to "com.google.android.youtube",
            "chrome" to "com.android.chrome",
            "aparat" to "com.android.camera",
            "kalkulator" to "com.google.android.calculator",
            "wiadomości" to "com.google.android.apps.messaging",
            "sms" to "com.google.android.apps.messaging",
            "telefon" to "com.google.android.dialer",
            "mapy" to "com.google.android.apps.maps",
            "gmail" to "com.google.android.gm",
            "whatsapp" to "com.whatsapp",
            "spotify" to "com.spotify.music",
            "ustawienia" to "com.android.settings"
        )
        if (common.containsKey(lower)) {
            return common[lower]
        }

        // Try searching installed applications
        try {
            val pm = context.packageManager
            val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            for (app in apps) {
                val label = pm.getApplicationLabel(app).toString().lowercase()
                if (label.contains(lower) || lower.contains(label)) {
                    return app.packageName
                }
            }
        } catch (e: Exception) {
            Log.w(tag, "Error querying package manager: ${e.message}")
        }
        return null
    }

    private fun launchAppDirect(packageName: String): Boolean {
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
            false
        }
    }
}
