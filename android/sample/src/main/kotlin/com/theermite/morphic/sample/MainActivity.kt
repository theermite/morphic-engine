package com.theermite.morphic.sample

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.theermite.morphic.onboarding.MorphicOnboarding
import com.theermite.morphic.onboarding.MorphicOnboardingScreen
import com.theermite.morphic.onboarding.OnboardingChoice
import com.theermite.morphic.onboarding.OnboardingStep
import com.theermite.morphic.onboarding.OnboardingStepUi
import com.theermite.morphic.state.MorphicState
import com.theermite.morphic.theme.MorphicProvider

/**
 * Drop-in demo: the dignified onboarding runs FIRST, inside [MorphicProvider].
 * Identity collection (here, a placeholder message) only appears once
 * `canCollectIdentity()` is satisfied — the Dignity §a contract, on screen.
 *
 * Copy is hard-coded in English here because this is the example app, not the
 * module; a real host wires its own i18n into [OnboardingStepUi].
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val morphicState = remember { MorphicState() }
            MorphicProvider(state = morphicState) {
                SampleFlow(morphicState)
            }
        }
    }
}

@Composable
private fun SampleFlow(morphicState: MorphicState) {
    val onboarding = remember { MorphicOnboarding(morphicState) }
    var onboarded by remember { mutableStateOf(false) }

    if (onboarded) {
        // Identity-collection UI would live here — reachable only past the guard.
        Text("Onboarding complete. Identity collection is now unlocked.")
    } else {
        MorphicOnboardingScreen(
            onboarding = onboarding,
            steps = SAMPLE_STEPS,
            onComplete = { onboarded = true },
        )
    }
}

private val SAMPLE_STEPS = listOf(
    OnboardingStepUi(
        step = OnboardingStep.THEME,
        title = "How do you prefer to read?",
        choices = listOf(
            OnboardingChoice("auto", "Match my system"),
            OnboardingChoice("light", "Light"),
            OnboardingChoice("dark", "Dark"),
        ),
        skipLabel = "Decide later",
    ),
    OnboardingStepUi(
        step = OnboardingStep.MOTION,
        title = "How much motion feels right?",
        choices = listOf(
            OnboardingChoice("auto", "Match my system"),
            OnboardingChoice("full", "Full animations"),
            OnboardingChoice("reduced", "Reduced"),
            OnboardingChoice("none", "None"),
        ),
        skipLabel = "Decide later",
    ),
    OnboardingStepUi(
        step = OnboardingStep.DENSITY,
        title = "How spaced out should things be?",
        choices = listOf(
            OnboardingChoice("comfortable", "Comfortable"),
            OnboardingChoice("compact", "Compact"),
            OnboardingChoice("spacious", "Spacious"),
        ),
        skipLabel = "Decide later",
    ),
)
