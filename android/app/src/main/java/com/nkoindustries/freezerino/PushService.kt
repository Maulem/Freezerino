package com.nkoindustries.freezerino

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/** Shows the expiry messages from the daily job (data messages: title, body, tag). */
class PushService : FirebaseMessagingService() {
    override fun onMessageReceived(msg: RemoteMessage) {
        val d = msg.data
        val title = d["title"] ?: msg.notification?.title ?: "Freezerino"
        val body = d["body"] ?: msg.notification?.body ?: ""
        show(this, title, body, d["tag"] ?: "freezerino-expiry")
    }

    override fun onNewToken(token: String) {
        (application as FreezerinoApp).store.onNewToken(token)
    }

    companion object {
        fun show(ctx: android.content.Context, title: String, body: String, tag: String) {
            if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && android.os.Build.VERSION.SDK_INT >= 33) return
            val open = PendingIntent.getActivity(ctx, 0,
                Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val n = NotificationCompat.Builder(ctx, FreezerinoApp.CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(0xFF1F5F8B.toInt())
                .setContentTitle(title)
                .setContentText(body.lineSequence().firstOrNull() ?: "")
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
            @Suppress("MissingPermission")
            NotificationManagerCompat.from(ctx).notify(tag, 1, n)
        }
    }
}
