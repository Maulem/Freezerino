package com.nkoindustries.freezerino

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.nkoindustries.freezerino.data.Store

class FreezerinoApp : Application() {
    lateinit var store: Store
        private set

    override fun onCreate() {
        super.onCreate()
        // Same Firebase project as the website. App id and key come from google-services.json (see build.gradle.kts).
        if (FirebaseApp.getApps(this).isEmpty()) {
            FirebaseApp.initializeApp(this, FirebaseOptions.Builder()
                .setProjectId("freezerino-84f37")
                .setApplicationId(BuildConfig.FIREBASE_APP_ID)
                .setApiKey(BuildConfig.FIREBASE_API_KEY)
                .setGcmSenderId("496373551831")
                .setStorageBucket("freezerino-84f37.firebasestorage.app")
                .build())
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "Validade", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Avisos quando uma comida passa da metade da validade, fica perto de vencer ou vence"
            })
        store = Store(this)
    }

    companion object { const val CHANNEL = "expiry" }
}
