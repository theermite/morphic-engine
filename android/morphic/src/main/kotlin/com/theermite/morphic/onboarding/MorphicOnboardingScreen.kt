package com.theermite.morphic.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

/**
 * Thin, accessible onboarding screen (A-5) — rendering only, zero logic.
 *
 * Drives [MorphicOnboarding] and renders the current sensoriel step. All copy is
 * supplied by the host via [steps] (i18n stays host-side — parity with the
 * "module exposes choices, host decides rendering" principle). The module owns
 * accessibility, not the words.
 *
 * Accessibility (CDC §6.bis): the step title is a TalkBack heading; every control
 * carries a contentDescription; touch targets are ≥ 48 dp.
 *
 * Per PET-Android §5.bis this Composable is NOT coverage-floored — generated
 * Compose code is not measurable. It is validated in a real app (TalkBack +
 * Accessibility Scanner), like [MorphicProvider] (A-4).
 */

/** One selectable option for a step. [description] is what TalkBack announces. */
public data class OnboardingChoice(
    /** Axis token value written into MorphicState (e.g. "dark", "reduced"). */
    val value: String,
    /** Visible label (host-supplied, i18n). */
    val label: String,
    /** TalkBack announcement; defaults to [label]. */
    val description: String = label,
)

/** Host-supplied UI copy for one onboarding step. */
public data class OnboardingStepUi(
    /** Which step this describes. */
    val step: OnboardingStep,
    /** Heading read by TalkBack. */
    val title: String,
    /** Options offered for this step. */
    val choices: List<OnboardingChoice>,
    /** Label of the "skip / decide later" action. */
    val skipLabel: String,
)

private val TOUCH_TARGET_MIN = 48.dp

/**
 * Render the onboarding ceremony. Calls [onComplete] once the three sensoriel
 * steps are done (the Dignity §a guard opens). The host gates identity UI on it.
 *
 * @param steps host-supplied copy for theme/motion/density (order independent —
 *   matched to the live step by [OnboardingStepUi.step]).
 * @param onStepResolved invoked right after each step is resolved (chosen or
 *   skipped), once the choice has been written into MorphicState. A host can use
 *   it to recompose its MorphicProvider so the just-applied axis previews live
 *   (Dignity §a: adaptation as the first proof of respect). Defaults to a no-op
 *   — backward compatible.
 */
@Composable
public fun MorphicOnboardingScreen(
    onboarding: MorphicOnboarding,
    steps: List<OnboardingStepUi>,
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
    onStepResolved: (OnboardingStep) -> Unit = {},
) {
    var current by remember { mutableStateOf(onboarding.start().currentStep) }

    LaunchedEffect(current) {
        if (current == null) onComplete()
    }

    val step = current ?: return
    val ui = steps.firstOrNull { it.step == step } ?: return

    Column(
        modifier = modifier.fillMaxWidth().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(text = ui.title, modifier = Modifier.semantics { heading() })

        ui.choices.forEach { choice ->
            Button(
                onClick = {
                    onboarding.completeStep(step, choice.value)
                    onStepResolved(step)
                    current = onboarding.getState().currentStep
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = TOUCH_TARGET_MIN)
                    .semantics { contentDescription = choice.description },
            ) {
                Text(choice.label)
            }
        }

        OutlinedButton(
            onClick = {
                onboarding.skipStep(step)
                onStepResolved(step)
                current = onboarding.getState().currentStep
            },
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = TOUCH_TARGET_MIN)
                .semantics { contentDescription = ui.skipLabel },
        ) {
            Text(ui.skipLabel)
        }
    }
}
