plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kover)
    alias(libs.plugins.maven.publish)
}

android {
    namespace = "com.theermite.morphic"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        minSdk = libs.versions.minSdk.get().toInt()
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
    implementation(libs.androidx.datastore.preferences)

    // Compose — the BOM aligns every module version. `api` for the modules that
    // appear in MorphicProvider's public surface so consumers get them transitively.
    val composeBom = platform(libs.androidx.compose.bom)
    api(composeBom)
    api(libs.androidx.compose.runtime)
    api(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.ui)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}

// Maven Central publishing (A-6). vanniktech auto-detects the Android library and
// publishes the `release` variant with sources + javadoc jars. `publishToMavenCentral`
// targets the Central Portal; `signAllPublications` is required for a real release
// (skipped automatically by `publishToMavenLocal`, the CI dry-run). The real publish
// is gated on the maintainer's Central Portal account + signing secrets — see
// android/PUBLISHING.md. License is Apache-2.0 (android/ subtree override, not repo AGPL).
// Sign only when a key is present (release workflow sets ORG_GRADLE_PROJECT_signingInMemoryKey).
// The CI dry-run (publishToMavenLocal) has no key — signing it would fail with
// "no configured signatory", so it is skipped there. Maven Central still gets
// signed artifacts because the release workflow provides the key.
val signingKeyPresent = project.hasProperty("signingInMemoryKey")

mavenPublishing {
    publishToMavenCentral()
    if (signingKeyPresent) {
        signAllPublications()
    }

    coordinates("com.theermite.morphic", "morphic", "0.1.0")

    pom {
        name.set("morphic-android")
        description.set(
            "Framework-agnostic morphic adaptation engine for Android: sensory " +
                "preference adaptation + sensoriel-before-identity onboarding (Dignity).",
        )
        inceptionYear.set("2026")
        url.set("https://github.com/theermite/morphic-engine")
        licenses {
            license {
                name.set("The Apache License, Version 2.0")
                url.set("https://www.apache.org/licenses/LICENSE-2.0.txt")
            }
        }
        developers {
            developer {
                id.set("theermite")
                name.set("The Ermite")
                url.set("https://github.com/theermite")
            }
        }
        scm {
            url.set("https://github.com/theermite/morphic-engine")
            connection.set("scm:git:git://github.com/theermite/morphic-engine.git")
            developerConnection.set("scm:git:ssh://git@github.com/theermite/morphic-engine.git")
        }
    }
}
