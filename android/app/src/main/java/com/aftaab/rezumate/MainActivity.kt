package com.aftaab.rezumate

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.aftaab.rezumate.ui.RezumateApp

class MainActivity : ComponentActivity() {
    private var documentUri by mutableStateOf<android.net.Uri?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        documentUri = intent.documentUri()
        enableEdgeToEdge()
        setContent {
            RezumateApp(initialDocumentUri = documentUri)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        documentUri = intent.documentUri()
    }
}

private fun Intent.documentUri() = data?.takeIf {
    action == Intent.ACTION_VIEW
}
