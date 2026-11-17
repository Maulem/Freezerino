import java.util.Properties

plugins {
    id("com.android.application")
}

// Signing key lives outside the repo; key.properties (git-ignored) says where.
val keyProps = Properties().apply {
    val f = rootProject.file("key.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.nkoindustries.freezerino"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.nkoindustries.freezerino"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
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
}

dependencies {
    // Trusted Web Activity: opens https://maulem.github.io/Freezerino/ full screen in Chrome
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.4")
}
