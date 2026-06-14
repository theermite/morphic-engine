// Root build script for the Android subtree. Plugins are declared here with
// `apply false` and applied in the module that needs them (:morphic).
plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kover) apply false
    alias(libs.plugins.compose.compiler) apply false
    alias(libs.plugins.maven.publish) apply false
}
