// Sample app (A-6) — demonstrates the drop-in: MorphicProvider (A-4) + the
// dignified onboarding (A-5). Not published; built in CI (`assembleDebug`) to
// prove the public API compiles, and installed by hand to validate the
// Composables (TalkBack, Accessibility Scanner) — the real-app validation that
// CI cannot do (PET-Android §5.bis).
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.theermite.morphic.sample"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.theermite.morphic.sample"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.compileSdk.get().toInt()
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(project(":morphic"))

    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.activity.compose)
}
