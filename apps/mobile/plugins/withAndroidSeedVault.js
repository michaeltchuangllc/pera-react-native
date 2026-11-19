/* eslint-disable @typescript-eslint/no-require-imports */
const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * @type {import('expo/config-plugins').ConfigPlugin}
 *
 * The Seed Vault SDK is consumed from Maven Local (see
 * wallet-provider-extensions/seed-vault/react-native), so every project needs
 * `mavenLocal()` to resolve it.
 */
const MARKER = 'mavenLocal()';

const KOTLIN_SNIPPET = `

// The Seed Vault SDK is built with Kotlin 2.4 and drags in its stdlib; keep the
// app on its own Kotlin version and let it read the SDK's newer metadata.
subprojects {
  configurations.configureEach {
    resolutionStrategy.eachDependency { details ->
      if (details.requested.group == 'org.jetbrains.kotlin' && details.requested.name.startsWith('kotlin-stdlib')) {
        details.useVersion(findProperty('android.kotlinVersion') ?: '2.2.10')
      }
    }
  }
  tasks.configureEach { task ->
    if (task.class.name.contains('KotlinCompile')) {
      task.compilerOptions.freeCompilerArgs.add('-Xskip-metadata-version-check')
    }
  }
}
`;
const KOTLIN_MARKER = '-Xskip-metadata-version-check';

const withAndroidSeedVault = (config) =>
  withProjectBuildGradle(config, (config) => {
    const { contents } = config.modResults;
    if (!contents.includes(MARKER)) {
      config.modResults.contents = contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => `${match}\n        ${MARKER}`,
      );
    }
    if (!config.modResults.contents.includes(KOTLIN_MARKER)) {
      config.modResults.contents = config.modResults.contents.replace(
        /\napply plugin: "expo-root-project"/,
        `${KOTLIN_SNIPPET}\napply plugin: "expo-root-project"`,
      );
    }
    return config;
  });

module.exports = withAndroidSeedVault;
