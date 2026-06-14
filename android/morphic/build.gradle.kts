plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kover)
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

// Coverage floors as a build gate (not just a report). `koverVerify` fails CI
// below the bounds — "la preuve, jamais l'affirmation" (Monozukuri).
kover {
    reports {
        filters {
            excludes {
                // Generated @Composable bytecode is not measurable (PET-Android §5.bis) —
                // exclude it everywhere so the floors reflect real, testable logic.
                annotatedBy("androidx.compose.runtime.Composable")
                // Host-facing UI data carriers for the onboarding screen: UI layer,
                // exercised only by the (excluded) Composable. Not logic.
                classes(
                    "com.theermite.morphic.onboarding.OnboardingChoice",
                    "com.theermite.morphic.onboarding.OnboardingStepUi",
                )
            }
        }
        verify {
            // Sensitive module floor — axes, state, persistence, resolution (A-1→A-4).
            rule {
                minBound(90)
            }
            // Critical floor — onboarding state machine + identity guard (A-5,
            // Dignity §a). Scoped to the logic classes; data/enum carriers stay
            // under the module floor above.
            rule {
                filters {
                    includes {
                        classes(
                            "com.theermite.morphic.onboarding.MorphicOnboarding",
                            "com.theermite.morphic.onboarding.OnboardingKt",
                        )
                    }
                }
                minBound(95)
            }
        }
    }
}
