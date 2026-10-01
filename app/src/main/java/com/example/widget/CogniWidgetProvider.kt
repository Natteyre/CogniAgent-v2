package com.example.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.widget.RemoteViews
import com.example.CogniAgentApp
import com.example.MainActivity
import com.example.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CogniWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_VOICE = "com.example.ACTION_WIDGET_VOICE"
        const val ACTION_WIDGET_TORCH = "com.example.ACTION_WIDGET_TORCH"
        const val ACTION_WIDGET_ROUTINE = "com.example.ACTION_WIDGET_ROUTINE"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, CogniWidgetProvider::class.java)
            val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            val intent = Intent(context, CogniWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, allWidgetIds)
            }
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val app = context.applicationContext as? CogniAgentApp

        when (intent.action) {
            ACTION_WIDGET_VOICE -> {
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("START_VOICE_IMMEDIATE", true)
                }
                context.startActivity(launchIntent)
            }
            ACTION_WIDGET_TORCH -> {
                app?.hardwareManager?.toggleTorch()
                updateAllWidgets(context)
            }
            ACTION_WIDGET_ROUTINE -> {
                CoroutineScope(Dispatchers.IO).launch {
                    val skills = app?.database?.skillDao()?.getSkillByName("Poranna Rutyna")
                    if (skills != null && app != null) {
                        app.routineExecutor.executeActionsJson(skills.actionsJson)
                    } else {
                        app?.ttsManager?.speak("Uruchamiam szybką procedurę.")
                    }
                }
            }
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.cogni_widget)

        // Query Battery
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val batteryLevel = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
        val levelStr = if (batteryLevel >= 0) "$batteryLevel%" else "--%"
        views.setTextViewText(R.id.widget_battery, "Bateria: $levelStr")

        // 1. Voice PendingIntent
        val voiceIntent = Intent(context, CogniWidgetProvider::class.java).apply {
            action = ACTION_WIDGET_VOICE
        }
        val voicePendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            voiceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_widget_voice, voicePendingIntent)

        // 2. Torch PendingIntent
        val torchIntent = Intent(context, CogniWidgetProvider::class.java).apply {
            action = ACTION_WIDGET_TORCH
        }
        val torchPendingIntent = PendingIntent.getBroadcast(
            context,
            1002,
            torchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_widget_torch, torchPendingIntent)

        // 3. Routine PendingIntent
        val routineIntent = Intent(context, CogniWidgetProvider::class.java).apply {
            action = ACTION_WIDGET_ROUTINE
        }
        val routinePendingIntent = PendingIntent.getBroadcast(
            context,
            1003,
            routineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_widget_routine, routinePendingIntent)

        // 4. Tap Title to Open App
        val openAppIntent = Intent(context, MainActivity::class.java)
        val openAppPendingIntent = PendingIntent.getActivity(
            context,
            1004,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openAppPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
