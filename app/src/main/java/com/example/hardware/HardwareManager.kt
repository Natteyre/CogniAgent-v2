package com.example.hardware

import android.accessibilityservice.AccessibilityServiceInfo
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityManager
import com.example.data.model.HardwareState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class HardwareManager(private val context: Context) {

    private val tag = "HardwareManager"

    private val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter

    private val _hardwareState = MutableStateFlow(HardwareState())
    val hardwareState: StateFlow<HardwareState> = _hardwareState.asStateFlow()

    private var cameraIdWithFlash: String? = null
    private var isTorchActive = false

    private val torchCallback = object : CameraManager.TorchCallback() {
        override fun onTorchModeChanged(cameraId: String, enabled: Boolean) {
            super.onTorchModeChanged(cameraId, enabled)
            if (cameraId == cameraIdWithFlash) {
                isTorchActive = enabled
                updateState()
            }
        }
    }

    init {
        findFlashCamera()
        registerTorchCallback()
        updateState()
    }

    private fun findFlashCamera() {
        try {
            cameraManager?.cameraIdList?.forEach { id ->
                val chars = cameraManager.getCameraCharacteristics(id)
                val hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                if (hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    cameraIdWithFlash = id
                    return
                }
            }
            if (cameraIdWithFlash == null && (cameraManager?.cameraIdList?.isNotEmpty() == true)) {
                cameraIdWithFlash = cameraManager.cameraIdList[0]
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to identify camera with flash: ${e.message}")
        }
    }

    private fun registerTorchCallback() {
        try {
            cameraManager?.registerTorchCallback(torchCallback, null)
        } catch (e: Exception) {
            Log.w(tag, "Torch callback registration error: ${e.message}")
        }
    }

    /**
     * Toggles the LED torch/flashlight safely via CameraManager.
     */
    fun setTorch(enable: Boolean): Boolean {
        return try {
            val camId = cameraIdWithFlash ?: return false
            cameraManager?.setTorchMode(camId, enable)
            isTorchActive = enable
            updateState()
            true
        } catch (e: Exception) {
            Log.e(tag, "Failed to set torch mode $enable: ${e.message}")
            false
        }
    }

    fun toggleTorch(): Boolean {
        return setTorch(!isTorchActive)
    }

    /**
     * Programmatically control Bluetooth.
     * Note: API 33+ might require user confirmation or setting intent; handles API 29-32 natively.
     */
    @SuppressLint("MissingPermission")
    fun setBluetooth(enable: Boolean): Boolean {
        val adapter = bluetoothAdapter ?: return false
        return try {
            if (enable) {
                @Suppress("DEPRECATION")
                val success = adapter.enable()
                updateState()
                success
            } else {
                @Suppress("DEPRECATION")
                val success = adapter.disable()
                updateState()
                success
            }
        } catch (e: Exception) {
            Log.e(tag, "Bluetooth toggle error: ${e.message}")
            false
        }
    }

    /**
     * Reads battery percentage and charging state via BatteryManager & Intent.
     */
    fun getBatteryMetrics(): Pair<Int, Boolean> {
        return try {
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            val batteryLevel = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1

            val intentFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus: Intent? = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.registerReceiver(null, intentFilter, Context.RECEIVER_NOT_EXPORTED)
                } else {
                    context.registerReceiver(null, intentFilter)
                }
            } catch (t: Throwable) {
                null
            }

            val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL

            val resolvedLevel = if (batteryLevel in 0..100) {
                batteryLevel
            } else {
                val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: 100
                val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: 100
                if (scale > 0) ((level / scale.toFloat()) * 100).toInt() else 100
            }

            Pair(resolvedLevel.coerceIn(0, 100), isCharging)
        } catch (t: Throwable) {
            Log.w(tag, "Battery metrics query error: ${t.message}")
            Pair(100, false)
        }
    }

    /**
     * Checks if CogniAgent's accessibility service is actively enabled by the user.
     */
    fun isAccessibilityServiceEnabled(): Boolean {
        return try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager ?: return false
            val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK) ?: return false
            val expectedServiceName = "${context.packageName}/com.example.automation.AgentAccessibilityService"
            val expectedSimpleName = "com.example.automation.AgentAccessibilityService"

            enabledServices.any {
                it.id?.contains(expectedServiceName) == true || it.id?.contains(expectedSimpleName) == true
            }
        } catch (t: Throwable) {
            false
        }
    }

    /**
     * Checks if notification listener permission is granted.
     */
    fun isNotificationListenerEnabled(): Boolean {
        return try {
            val enabledListeners = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
            enabledListeners?.contains(context.packageName) == true
        } catch (t: Throwable) {
            false
        }
    }

    fun updateState() {
        try {
            val (battery, charging) = getBatteryMetrics()
            val btEnabled = try {
                bluetoothAdapter?.isEnabled == true
            } catch (t: Throwable) {
                false
            }

            _hardwareState.value = HardwareState(
                batteryPercent = battery,
                isCharging = charging,
                isTorchOn = isTorchActive,
                isBluetoothEnabled = btEnabled,
                isAccessibilityActive = isAccessibilityServiceEnabled(),
                isNotificationListenerActive = isNotificationListenerEnabled()
            )
        } catch (t: Throwable) {
            Log.w(tag, "updateState error: ${t.message}")
        }
    }

    /**
     * Sets device media volume as a percentage 0..100.
     */
    fun setDeviceVolume(percent: Int): Boolean {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            if (audioManager != null) {
                val max = audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC)
                val target = ((percent.coerceIn(0, 100) * max) / 100).coerceIn(0, max)
                audioManager.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, target, 0)
                true
            } else false
        } catch (e: Exception) {
            Log.e(tag, "setDeviceVolume error: ${e.message}")
            false
        }
    }

    /**
     * Launches system timer via AlarmClock Intent.
     */
    fun setTimer(seconds: Int, label: String = "CogniAgent Timer"): Boolean {
        return try {
            val intent = Intent(android.provider.AlarmClock.ACTION_SET_TIMER).apply {
                putExtra(android.provider.AlarmClock.EXTRA_LENGTH, seconds)
                putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, label)
                putExtra(android.provider.AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(tag, "setTimer error: ${e.message}")
            false
        }
    }

    /**
     * Launches system alarm via AlarmClock Intent.
     */
    fun setAlarm(hour: Int, minute: Int, label: String = "CogniAgent Alarm"): Boolean {
        return try {
            val intent = Intent(android.provider.AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(android.provider.AlarmClock.EXTRA_HOUR, hour)
                putExtra(android.provider.AlarmClock.EXTRA_MINUTES, minute)
                putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, label)
                putExtra(android.provider.AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(tag, "setAlarm error: ${e.message}")
            false
        }
    }
}
