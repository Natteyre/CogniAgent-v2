package com.example

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.CogniMainScreen
import com.example.ui.MainViewModel
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                val viewModel: MainViewModel = viewModel()

                val startVoice = intent?.getBooleanExtra("START_VOICE_IMMEDIATE", false) == true
                if (startVoice) {
                    intent?.removeExtra("START_VOICE_IMMEDIATE")
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        viewModel.startVoiceInput { err ->
                            Toast.makeText(this, err, Toast.LENGTH_SHORT).show()
                        }
                    }
                }

                CogniMainScreen(viewModel = viewModel)
            }
        }
    }
}
