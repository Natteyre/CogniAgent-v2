package com.example.overlay

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import com.example.CogniAgentApp
import com.example.MainActivity
import com.example.R
import com.example.automation.AgentAccessibilityService
import com.example.data.model.LlmSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CogniFloatingService : Service() {

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var chatCardView: View? = null
    private var isChatExpanded = false

    private val serviceScope = CoroutineScope(Dispatchers.Main)

    companion object {
        var isFloatingActive = false
            private set
    }

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val bubbleParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 80
            y = 220
        }

        val inflater = LayoutInflater.from(this)
        bubbleView = inflater.inflate(R.layout.floating_assistant_head, null)

        val closeBtn = bubbleView?.findViewById<ImageView>(R.id.floating_close)

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var hasMoved = false

        bubbleView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = bubbleParams.x
                    initialY = bubbleParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    hasMoved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = (event.rawX - initialTouchX).toInt()
                    val deltaY = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                        hasMoved = true
                        bubbleParams.x = initialX + deltaX
                        bubbleParams.y = initialY + deltaY
                        windowManager?.updateViewLayout(bubbleView, bubbleParams)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!hasMoved) {
                        // Expand floating mini-chat card!
                        showChatCard(layoutType, bubbleParams.x, bubbleParams.y)
                    }
                    true
                }
                else -> false
            }
        }

        closeBtn?.setOnClickListener {
            stopSelf()
        }

        try {
            windowManager?.addView(bubbleView, bubbleParams)
            isFloatingActive = true
        } catch (e: Exception) {
            stopSelf()
        }
    }

    private fun showChatCard(layoutType: Int, posX: Int, posY: Int) {
        if (isChatExpanded) return

        val app = applicationContext as? CogniAgentApp
        val inflater = LayoutInflater.from(this)
        chatCardView = inflater.inflate(R.layout.floating_chat_card, null)

        val chatParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = posX.coerceAtLeast(20)
            y = posY.coerceAtLeast(100)
        }

        val tvResponse = chatCardView?.findViewById<TextView>(R.id.tv_floating_response)
        val etInput = chatCardView?.findViewById<EditText>(R.id.et_floating_input)
        val btnSend = chatCardView?.findViewById<ImageView>(R.id.btn_floating_send)
        val btnMic = chatCardView?.findViewById<ImageView>(R.id.btn_floating_mic)
        val btnCollapse = chatCardView?.findViewById<ImageView>(R.id.btn_floating_collapse)
        val btnFullscreen = chatCardView?.findViewById<ImageView>(R.id.btn_floating_fullscreen)
        val chipScreen = chatCardView?.findViewById<TextView>(R.id.chip_floating_screen)
        val chipTorch = chatCardView?.findViewById<TextView>(R.id.chip_floating_torch)
        val chipBattery = chatCardView?.findViewById<TextView>(R.id.chip_floating_battery)

        btnCollapse?.setOnClickListener {
            hideChatCard()
        }

        btnFullscreen?.setOnClickListener {
            hideChatCard()
            val intent = Intent(applicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(intent)
        }

        chipScreen?.setOnClickListener {
            serviceScope.launch {
                val service = AgentAccessibilityService.getInstance()
                if (service != null) {
                    val screenText = service.extractScreenText()
                    val preview = screenText.lines().filter { it.isNotBlank() }.take(5).joinToString(". ")
                    tvResponse?.text = "Zawartość ekranu:\n$preview"
                    app?.ttsManager?.speak("Podsumowanie ekranu: $preview")
                } else {
                    tvResponse?.text = "Włącz usługę dostępności w ustawieniach."
                    app?.ttsManager?.speak("Usługa dostępności nie jest aktywna.")
                }
            }
        }

        chipTorch?.setOnClickListener {
            app?.hardwareManager?.toggleTorch()
            tvResponse?.text = "Przełączono latarkę LED."
        }

        chipBattery?.setOnClickListener {
            val (lvl, chg) = app?.hardwareManager?.getBatteryMetrics() ?: Pair(100, false)
            val msg = "Poziom baterii: $lvl% ${if (chg) "(ładowanie)" else ""}"
            tvResponse?.text = msg
            app?.ttsManager?.speak(msg)
        }

        btnSend?.setOnClickListener {
            val text = etInput?.text?.toString()?.trim() ?: ""
            if (text.isNotEmpty() && app != null) {
                etInput?.setText("")
                tvResponse?.text = "Przetwarzanie: $text..."
                serviceScope.launch {
                    val (answer, _) = withContext(Dispatchers.IO) {
                        app.hybridAgentManager.processUserMessage(text, LlmSettings())
                    }
                    tvResponse?.text = answer
                }
            }
        }

        btnMic?.setOnClickListener {
            hideChatCard()
            val intent = Intent(applicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("START_VOICE_IMMEDIATE", true)
            }
            startActivity(intent)
        }

        try {
            windowManager?.addView(chatCardView, chatParams)
            bubbleView?.visibility = View.GONE
            isChatExpanded = true
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun hideChatCard() {
        if (!isChatExpanded) return
        try {
            if (chatCardView != null) {
                windowManager?.removeView(chatCardView)
                chatCardView = null
            }
            bubbleView?.visibility = View.VISIBLE
            isChatExpanded = false
        } catch (e: Exception) {
            // Ignore
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        hideChatCard()
        if (bubbleView != null) {
            try {
                windowManager?.removeView(bubbleView)
            } catch (e: Exception) {
                // Ignore
            }
        }
        isFloatingActive = false
    }
}
