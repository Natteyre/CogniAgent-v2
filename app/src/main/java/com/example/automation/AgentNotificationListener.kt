package com.example.automation

import android.app.Notification
import android.content.Context
import android.os.PowerManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.example.CogniAgentApp

class AgentNotificationListener : NotificationListenerService() {

    private val tag = "AgentNotification"

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification.extras ?: return

        // Filter incoming SMS and Gmail alerts
        val isSms = packageName.contains("messaging", ignoreCase = true) ||
                packageName.contains("mms", ignoreCase = true) ||
                packageName == "com.google.android.apps.messaging"

        val isGmail = packageName == "com.google.android.gm" ||
                packageName.contains("email", ignoreCase = true)

        if (!isSms && !isGmail) {
            return
        }

        // Check if device screen is OFF (phone is locked or sleeping)
        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isScreenOn = powerManager?.isInteractive == true

        if (isScreenOn) {
            Log.d(tag, "Screen is ON; skipping spoken alert for notification from $packageName")
            return
        }

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        if (title.isEmpty() && text.isEmpty()) return

        val app = applicationContext as? CogniAgentApp
        val tts = app?.ttsManager

        val announcement = if (isSms) {
            "Nowa wiadomość SMS od $title: $text"
        } else {
            "Nowa wiadomość e-mail od $title. Temat: $text"
        }

        Log.i(tag, "Screen is off. Announcing notification: $announcement")
        tts?.speak(announcement)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
