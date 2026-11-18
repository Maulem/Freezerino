import groovy.json.JsonSlurper
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Signing key lives outside the repo; key.properties (git-ignored) says where.
val keyProps = Properties().apply {
    val f = rootProject.file("key.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

// Firebase settings come from app/google-services.json (Firebase console → Android app).
// Read here instead of using the google-services plugin. Without the file the web app's values are used,
// which is enough for login and data but not for notifications.
@Suppress("UNCHECKED_CAST")
val firebase: Map<String, String> = run {
    val f = file("google-services.json")
    if (!f.exists()) return@run mapOf(
        "appId" to "1:496373551831:web:d51578e616eb75e9835692",
        "apiKey" to "AIzaSyAmja8wD70N52UCmX7Ly4dWKMxRkPBwtCE",
    )
    val json = JsonSlurper().parse(f) as Map<String, Any>
    val clients = json["client"] as List<Map<String, Any>>
    val client = clients.first {
        ((it["client_info"] as Map<String, Any>)["android_client_info"] as Map<String, Any>)["package_name"] == "com.nkoindustries.freezerino"
    }
    mapOf(
        "appId" to (client["client_info"] as Map<String, Any>)["mobilesdk_app_id"] as String,
        "apiKey" to ((client["api_key"] as List<Map<String, Any>>).first()["current_key"] as String),
    )
}

android {
    namespace = "com.nkoindustries.freezerino"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.nkoindustries.freezerino"
        minSdk = 26
        targetSdk = 36
        versionCode = 6
        versionName = "2.4"
        buildConfigField("String", "FIREBASE_APP_ID", "\"${firebase["appId"]}\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"${firebase["apiKey"]}\"")
    }

    signingConfigs {
        create("release") {
            if (keyProps.isNotEmpty()) {
                storeFile = file(keyProps.getProperty("storeFile"))
                storePassword = keyProps.getProperty("storePassword")
                keyAlias = keyProps.getProperty("keyAlias")
                keyPassword = keyProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keyProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation(platform("androidx.compose:compose-bom:2025.08.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")

    implementation(platform("com.google.firebase:firebase-bom:34.4.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-messaging")
}
