package com.aftaab.rezumate

import android.app.Application
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader

class RezumateApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        PDFBoxResourceLoader.init(this)
    }
}
