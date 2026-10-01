package com.example.ui.screens.settings

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.BatteryFull
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.PictureInPicture
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.HardwareState
import com.example.data.model.KirinTelemetry
import com.example.data.model.LlmSettings
import com.example.nlu.DownloadState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    llmSettings: LlmSettings,
    hardwareState: HardwareState,
    testConnectionStatus: String?,
    availableVoices: List<String>,
    telemetry: KirinTelemetry,
    downloadState: DownloadState,
    isNluModelInstalled: Boolean,
    modelSizeMB: Float,
    isFloatingActive: Boolean,
    onUpdateSettings: (LlmSettings) -> Unit,
    onTestConnection: () -> Unit,
    onTestVoiceSpeech: () -> Unit,
    onToggleTorch: () -> Unit,
    onToggleBluetooth: () -> Unit,
    onRefreshHardware: () -> Unit,
    onDownloadModel: () -> Unit,
    onDeleteModel: () -> Unit,
    onToggleFloatingService: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    var apiKey by remember(llmSettings.apiKey) { mutableStateOf(llmSettings.apiKey) }
    var endpointUrl by remember(llmSettings.endpointUrl) { mutableStateOf(llmSettings.endpointUrl) }
    var modelName by remember(llmSettings.modelName) { mutableStateOf(llmSettings.modelName) }
    var isApiKeyVisible by remember { mutableStateOf(false) }

    var speechRate by remember(llmSettings.speechRate) { mutableFloatStateOf(llmSettings.speechRate) }
    var speechPitch by remember(llmSettings.speechPitch) { mutableFloatStateOf(llmSettings.speechPitch) }
    var selectedVoice by remember(llmSettings.voiceLanguage) {
        mutableStateOf(availableVoices.firstOrNull() ?: "Domyślny głos systemu (Polski)")
    }
    var voiceDropdownExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Header
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Konfiguracja i Diagnostyka",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "LLM Cloud, Polski TTS/STT, Huawei Kirin 980 Hardware",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                IconButton(
                    onClick = onRefreshHardware,
                    modifier = Modifier.testTag("refresh_hardware_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Odśwież stan sprzętu",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // Scrollable Settings Cards
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Card 1: Kirin 980 Telemetry & Savings
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth().testTag("telemetry_card")
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Memory,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Panel Telemetrii Kirin 980 NLU",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "4 rdzenie Cortex-A76 Big Cores aktywne",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Czas inferencji NLU:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = if (telemetry.lastLocalInferenceMs > 0) "${telemetry.lastLocalInferenceMs} ms" else "< 15 ms",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Column {
                            Text("Zapytania lokalne:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = "${telemetry.localQueriesHandled}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }

                        Column {
                            Text("Zaoszczędzone tokeny:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = "${telemetry.totalSavedTokens}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        }
                    }
                }
            }

            // Card 2: Offline NLU Model Downloader
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth().testTag("model_manager_card")
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.secondaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudDownload,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Menedżer Modeli NLU (Wagi ONNX)",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = if (isNluModelInstalled) "Zainstalowano wagi lokalne (${"%.1f".format(modelSizeMB)} MB)"
                                else "Używany szybki silnik regułowy (Dual Fallback)",
                                fontSize = 11.sp,
                                color = if (isNluModelInstalled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    when (downloadState) {
                        is DownloadState.Downloading -> {
                            Text(
                                text = "Pobieranie ${downloadState.currentFileName}: ${downloadState.progressPercent}% (${"%.1f".format(downloadState.downloadedMB)} MB / ${"%.1f".format(downloadState.totalMB)} MB)",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = { downloadState.progressPercent / 100f },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        is DownloadState.Completed -> {
                            Text(
                                text = downloadState.message,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        is DownloadState.Error -> {
                            Text(
                                text = downloadState.errorMessage,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        else -> {}
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = onDownloadModel,
                            shape = RoundedCornerShape(10.dp),
                            enabled = downloadState !is DownloadState.Downloading,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(imageVector = Icons.Default.CloudDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Pobierz Model NLU", fontSize = 12.sp)
                        }

                        if (isNluModelInstalled) {
                            OutlinedButton(
                                onClick = onDeleteModel,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(0.6f)
                            ) {
                                Icon(imageVector = Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Usuń", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // Card 3: LLM Provider Configuration
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("llm_settings_card")
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Cloud,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            text = "Konfiguracja Chmury LLM (OpenRouter / OpenAI)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // API Key Field
                    OutlinedTextField(
                        value = apiKey,
                        onValueChange = {
                            apiKey = it
                            onUpdateSettings(
                                llmSettings.copy(apiKey = it, endpointUrl = endpointUrl, modelName = modelName)
                            )
                        },
                        label = { Text("Klucz API (OpenRouter / OpenAI)") },
                        placeholder = { Text("sk-or-v1-...") },
                        visualTransformation = if (isApiKeyVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        trailingIcon = {
                            IconButton(onClick = { isApiKeyVisible = !isApiKeyVisible }) {
                                Icon(
                                    imageVector = if (isApiKeyVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = "Pokaż/Ukryj klucz"
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("api_key_input")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Endpoint URL Field
                    OutlinedTextField(
                        value = endpointUrl,
                        onValueChange = {
                            endpointUrl = it
                            onUpdateSettings(
                                llmSettings.copy(apiKey = apiKey, endpointUrl = it, modelName = modelName)
                            )
                        },
                        label = { Text("Adres bazowy Endpoint URL") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("endpoint_url_input")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Model Name Field
                    OutlinedTextField(
                        value = modelName,
                        onValueChange = {
                            modelName = it
                            onUpdateSettings(
                                llmSettings.copy(apiKey = apiKey, endpointUrl = endpointUrl, modelName = it)
                            )
                        },
                        label = { Text("Nazwa Modelu") },
                        placeholder = { Text("meta-llama/llama-3.1-8b-instruct:free") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("model_name_input")
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = onTestConnection,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        ),
                        modifier = Modifier.testTag("test_connection_button")
                    ) {
                        Text("Testuj Połączenie (Ping)")
                    }

                    if (testConnectionStatus != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (testConnectionStatus.startsWith("✓"))
                                        MaterialTheme.colorScheme.primaryContainer
                                    else
                                        MaterialTheme.colorScheme.errorContainer
                                )
                                .padding(10.dp)
                        ) {
                            Text(
                                text = testConnectionStatus,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = if (testConnectionStatus.startsWith("✓"))
                                    MaterialTheme.colorScheme.onPrimaryContainer
                                else
                                    MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            // Card 4: Polish TTS/STT Calibration
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("tts_settings_card")
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.secondaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.RecordVoiceOver,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            text = "Kalibracja Polskiego Głosu (TTS / STT)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Szybkość mowy: ${"%.1f".format(speechRate)}x",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Slider(
                        value = speechRate,
                        onValueChange = {
                            speechRate = it
                            onUpdateSettings(llmSettings.copy(speechRate = it))
                        },
                        valueRange = 0.5f..2.0f,
                        steps = 15,
                        colors = SliderDefaults.colors(
                            thumbColor = MaterialTheme.colorScheme.primary,
                            activeTrackColor = MaterialTheme.colorScheme.primary
                        ),
                        modifier = Modifier.testTag("speech_rate_slider")
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Ton głosu (Pitch): ${"%.1f".format(speechPitch)}x",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Slider(
                        value = speechPitch,
                        onValueChange = {
                            speechPitch = it
                            onUpdateSettings(llmSettings.copy(speechPitch = it))
                        },
                        valueRange = 0.5f..2.0f,
                        steps = 15,
                        colors = SliderDefaults.colors(
                            thumbColor = MaterialTheme.colorScheme.secondary,
                            activeTrackColor = MaterialTheme.colorScheme.secondary
                        ),
                        modifier = Modifier.testTag("speech_pitch_slider")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text("Silnik i profil głosu:", style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(4.dp))

                    ExposedDropdownMenuBox(
                        expanded = voiceDropdownExpanded,
                        onExpandedChange = { voiceDropdownExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedVoice,
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = voiceDropdownExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        )
                        ExposedDropdownMenu(
                            expanded = voiceDropdownExpanded,
                            onDismissRequest = { voiceDropdownExpanded = false }
                        ) {
                            val voices = availableVoices.ifEmpty { listOf("Domyślny systemowy silnik TTS (Polski)") }
                            voices.forEach { voice ->
                                DropdownMenuItem(
                                    text = { Text(voice) },
                                    onClick = {
                                        selectedVoice = voice
                                        voiceDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = onTestVoiceSpeech,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("test_voice_button")
                    ) {
                        Icon(imageVector = Icons.Default.RecordVoiceOver, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Przetestuj Wymowę Głosu (TTS)")
                    }
                }
            }

            // Card 5: Hardware Diagnostics & System States
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("hardware_state_card")
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Stan Sprzętu i Usług (Kirin 980)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Floating Overlay Switch
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PictureInPicture,
                                contentDescription = null,
                                tint = if (isFloatingActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Column {
                                Text("Pływający Dymek Asystenta (Overlay)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(
                                    if (isFloatingActive) "Dymek aktywny nad aplikacjami" else "Wyłączony",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = isFloatingActive,
                            onCheckedChange = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                                    val intent = Intent(
                                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                        Uri.parse("package:${context.packageName}")
                                    ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                                    context.startActivity(intent)
                                } else {
                                    onToggleFloatingService()
                                }
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.primary)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Battery Indicator
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = if (hardwareState.isCharging) Icons.Default.BatteryChargingFull else Icons.Default.BatteryFull,
                                contentDescription = null,
                                tint = if (hardwareState.isCharging) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Column {
                                Text("Bateria", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(
                                    if (hardwareState.isCharging) "Ładowanie aktywne" else "Praca na baterii",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Text(
                            text = "${hardwareState.batteryPercent}%",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Bluetooth Switch
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Bluetooth,
                                contentDescription = null,
                                tint = if (hardwareState.isBluetoothEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Column {
                                Text("Bluetooth", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(
                                    if (hardwareState.isBluetoothEnabled) "Włączony" else "Wyłączony",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = hardwareState.isBluetoothEnabled,
                            onCheckedChange = { onToggleBluetooth() },
                            colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.testTag("bluetooth_switch")
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Flashlight / Torch Switch
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.FlashlightOn,
                                contentDescription = null,
                                tint = if (hardwareState.isTorchOn) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Column {
                                Text("Latarka LED (Camera Torch)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(
                                    if (hardwareState.isTorchOn) "Dioda aktywna" else "Dioda wyłączona",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = hardwareState.isTorchOn,
                            onCheckedChange = { onToggleTorch() },
                            colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.tertiary),
                            modifier = Modifier.testTag("torch_switch")
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Accessibility Service Status
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Accessibility,
                                contentDescription = null,
                                tint = if (hardwareState.isAccessibilityActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                            )
                            Column {
                                Text("Usługa Dostępności (Automatyzacja UI & Gesty)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                Text(
                                    if (hardwareState.isAccessibilityActive) "Połączona (Gesty i odczyt ekranu aktywne)" else "Nieaktywna (wymaga włączenia)",
                                    fontSize = 11.sp,
                                    color = if (hardwareState.isAccessibilityActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                )
                            }
                        }

                        if (!hardwareState.isAccessibilityActive) {
                            IconButton(
                                onClick = {
                                    try {
                                        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        }
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        // Ignore
                                    }
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.OpenInNew,
                                    contentDescription = "Otwórz ustawienia dostępności",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        } else {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Aktywna",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Notification Listener Status
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = null,
                                tint = if (hardwareState.isNotificationListenerActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                            )
                            Column {
                                Text("Nasłuch Powiadomień (SMS/Gmail)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                Text(
                                    if (hardwareState.isNotificationListenerActive) "Uprawnienie aktywne" else "Wymaga zezwolenia w systemie",
                                    fontSize = 11.sp,
                                    color = if (hardwareState.isNotificationListenerActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        if (!hardwareState.isNotificationListenerActive) {
                            IconButton(
                                onClick = {
                                    try {
                                        val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        }
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        // Ignore
                                    }
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.OpenInNew,
                                    contentDescription = "Otwórz ustawienia powiadomień",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        } else {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Aktywna",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }
    }
}
