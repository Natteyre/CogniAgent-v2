package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AgentAccessibilityService : AccessibilityService() {

    private val tag = "AgentAccessibility"

    companion object {
        @Volatile
        private var instance: AgentAccessibilityService? = null

        fun getInstance(): AgentAccessibilityService? = instance
        fun isRunning(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(tag, "AgentAccessibilityService connected and ready for automation.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Can be used to track active windows or current package
    }

    override fun onInterrupt() {
        Log.w(tag, "AgentAccessibilityService interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
        Log.i(tag, "AgentAccessibilityService destroyed.")
    }

    /**
     * Finds interactive elements by text across the active window hierarchy and performs a CLICK.
     */
    fun clickNodeByText(targetText: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val matchedNodes = rootNode.findAccessibilityNodeInfosByText(targetText)

        if (matchedNodes.isNullOrEmpty()) {
            Log.d(tag, "No accessibility nodes matching '$targetText'")
            return false
        }

        for (node in matchedNodes) {
            if (node.isClickable) {
                val clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                Log.d(tag, "Clicked clickable node with text '$targetText': $clicked")
                return clicked
            }
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) {
                    val clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    Log.d(tag, "Clicked parent node for '$targetText': $clicked")
                    return clicked
                }
                parent = parent.parent
            }
        }
        return false
    }

    /**
     * Dispatches a tap gesture at specific screen coordinates (X, Y).
     */
    fun dispatchTap(x: Float, y: Float): Boolean {
        val path = Path().apply {
            moveTo(x, y)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, 100)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }

    /**
     * Dispatches a smooth swipe gesture between two points on the screen.
     */
    fun dispatchSwipe(startX: Float, startY: Float, endX: Float, endY: Float, durationMs: Long = 300L): Boolean {
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(50L, 1000L))
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }

    /**
     * Extracts and summarizes visible text from the entire current active window hierarchy.
     */
    fun extractScreenText(): String {
        val rootNode = rootInActiveWindow ?: return "Brak aktywnego okna lub zawartość ekranu jest niedostępna."
        val sb = StringBuilder()
        traverseNodeText(rootNode, sb)
        val result = sb.toString().trim()
        return if (result.isNotEmpty()) result else "Nie wykryto żadnego czytelnego tekstu na bieżącym ekranie."
    }

    private fun traverseNodeText(node: AccessibilityNodeInfo, sb: StringBuilder) {
        val text = node.text?.toString()?.trim()
        val desc = node.contentDescription?.toString()?.trim()

        if (!text.isNullOrEmpty()) {
            sb.append(text).append("\n")
        } else if (!desc.isNullOrEmpty()) {
            sb.append(desc).append("\n")
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            traverseNodeText(child, sb)
        }
    }

    /**
     * Launches an application even from a background or dimmed state using FLAG_ACTIVITY_NEW_TASK.
     */
    fun launchApplication(packageName: String): Boolean {
        return try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            }
            if (launchIntent != null) {
                startActivity(launchIntent)
                true
            } else {
                Log.w(tag, "Package launch intent not found: $packageName")
                false
            }
        } catch (e: Exception) {
            Log.e(tag, "Error launching application $packageName: ${e.message}")
            false
        }
    }
}
