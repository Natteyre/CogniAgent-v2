package com.example.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoFixHigh
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.overlay.CogniFloatingService
import com.example.ui.screens.chat.ChatScreen
import com.example.ui.screens.routines.RoutinesScreen
import com.example.ui.screens.settings.SettingsScreen

@Composable
fun CogniMainScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableIntStateOf(0) }
    var isFloatingActive by remember { mutableStateOf(CogniFloatingService.isFloatingActive) }

    val messages by viewModel.messages.collectAsStateWithLifecycle()
    val skills by viewModel.skills.collectAsStateWithLifecycle()
    val triggers by viewModel.triggers.collectAsStateWithLifecycle()
    val hardwareState by viewModel.hardwareState.collectAsStateWithLifecycle()
    val llmSettings by viewModel.llmSettings.collectAsStateWithLifecycle()
    val isProcessing by viewModel.isProcessing.collectAsStateWithLifecycle()
    val isListening by viewModel.isListening.collectAsStateWithLifecycle()
    val isSpeaking by viewModel.isSpeaking.collectAsStateWithLifecycle()
    val rmsLevel by viewModel.rmsLevel.collectAsStateWithLifecycle()
    val availableVoices by viewModel.availableVoices.collectAsStateWithLifecycle()
    val testConnectionStatus by viewModel.testConnectionStatus.collectAsStateWithLifecycle()
    val telemetry by viewModel.telemetry.collectAsStateWithLifecycle()
    val downloadState by viewModel.downloadState.collectAsStateWithLifecycle()
    val wakeWordActive by viewModel.wakeWordActive.collectAsStateWithLifecycle()

    // Permission launcher for Voice input
    val audioPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            viewModel.startVoiceInput { errorMsg ->
                Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(context, "Wymagane uprawnienie do nagrywania dźwięku (Mikrofon)", Toast.LENGTH_LONG).show()
        }
    }

    // BackHandler to return to Chat tab
    BackHandler(enabled = selectedTab != 0) {
        selectedTab = 0
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.testTag("bottom_nav_bar")
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.ChatBubble, contentDescription = "Czat") },
                    label = { Text("Czat AI") },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier.testTag("nav_tab_chat")
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.AutoFixHigh, contentDescription = "Rutyny") },
                    label = { Text("Rutyny") },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = MaterialTheme.colorScheme.secondaryContainer,
                        selectedIconColor = MaterialTheme.colorScheme.secondary,
                        selectedTextColor = MaterialTheme.colorScheme.secondary
                    ),
                    modifier = Modifier.testTag("nav_tab_routines")
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Ustawienia") },
                    label = { Text("Ustawienia") },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier.testTag("nav_tab_settings")
                )
            }
        }
    ) { innerPadding ->
        when (selectedTab) {
            0 -> ChatScreen(
                messages = messages,
                hardwareState = hardwareState,
                isProcessing = isProcessing,
                isListening = isListening,
                isSpeaking = isSpeaking,
                wakeWordActive = wakeWordActive,
                rmsLevel = rmsLevel,
                onSendMessage = { viewModel.sendMessage(it) },
                onStartVoice = {
                    val hasPerm = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED

                    if (hasPerm) {
                        viewModel.startVoiceInput { errorMsg ->
                            Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                },
                onStopVoice = { viewModel.stopVoiceInput() },
                onToggleWakeWord = {
                    val hasPerm = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED

                    if (hasPerm) {
                        viewModel.toggleWakeWordListening { errorMsg ->
                            Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                },
                onSummarizeScreen = { viewModel.summarizeCurrentScreen() },
                onToggleTorch = { viewModel.toggleTorch() },
                onClearChat = { viewModel.clearChat() },
                modifier = Modifier.padding(innerPadding)
            )
            1 -> RoutinesScreen(
                skills = skills,
                triggers = triggers,
                onExecuteSkill = { viewModel.executeSkill(it) },
                onSaveSkill = { name, actions -> viewModel.saveSkill(name, actions) },
                onDeleteSkill = { viewModel.deleteSkill(it) },
                onSaveTrigger = { type, name -> viewModel.saveTrigger(type, name) },
                onToggleTrigger = { viewModel.toggleTrigger(it) },
                onDeleteTrigger = { viewModel.deleteTrigger(it) },
                modifier = Modifier.padding(innerPadding)
            )
            2 -> SettingsScreen(
                llmSettings = llmSettings,
                hardwareState = hardwareState,
                testConnectionStatus = testConnectionStatus,
                availableVoices = availableVoices,
                telemetry = telemetry,
                downloadState = downloadState,
                isNluModelInstalled = viewModel.isNluModelInstalled(),
                modelSizeMB = viewModel.getModelSizeMB(),
                isFloatingActive = isFloatingActive,
                onUpdateSettings = { viewModel.updateSettings(it) },
                onTestConnection = { viewModel.testConnection() },
                onTestVoiceSpeech = { viewModel.testVoiceSpeech() },
                onToggleTorch = { viewModel.toggleTorch() },
                onToggleBluetooth = { viewModel.toggleBluetooth() },
                onRefreshHardware = { viewModel.refreshHardwareState() },
                onDownloadModel = {
                    viewModel.startModelDownload(
                        onSuccess = { Toast.makeText(context, "Model NLU zainstalowany pomyślnie!", Toast.LENGTH_SHORT).show() },
                        onError = { err -> Toast.makeText(context, err, Toast.LENGTH_LONG).show() }
                    )
                },
                onDeleteModel = {
                    val deleted = viewModel.deleteNluModel()
                    if (deleted) Toast.makeText(context, "Usunięto model NLU z pamięci", Toast.LENGTH_SHORT).show()
                },
                onToggleFloatingService = {
                    val serviceIntent = Intent(context, CogniFloatingService::class.java)
                    if (isFloatingActive) {
                        context.stopService(serviceIntent)
                        isFloatingActive = false
                    } else {
                        context.startService(serviceIntent)
                        isFloatingActive = true
                    }
                },
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}
