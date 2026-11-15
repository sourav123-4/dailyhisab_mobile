const { withAppBuildGradle, withGradleProperties, withMainActivity } = require('expo/config-plugins');

/**
 * Release hardening for Android. The android/ folder is generated, so these settings live here:
 *  - release builds are signed with the private key described in credentials/keystore.properties
 *    (never the public debug key) and fail loudly if that file is missing;
 *  - R8 shrinks and renames the Java/Kotlin code;
 *  - release builds block screenshots, screen recording and the recent-apps preview (FLAG_SECURE);
 *  - a release build closes itself if it has been re-signed with someone else's key.
 */

const MARK = '@wellth-hardening';

const GRADLE_HEAD = `
// ${MARK}: private release signing key (see credentials/keystore.properties)
def wellthKeystoreFile = rootProject.file("../credentials/keystore.properties")
def wellthKeystore = new Properties()
if (wellthKeystoreFile.exists()) {
    wellthKeystoreFile.withInputStream { wellthKeystore.load(it) }
}
gradle.taskGraph.whenReady { graph ->
    def buildsRelease = graph.allTasks.any { it.project == project && it.name.toLowerCase().contains("release") }
    if (buildsRelease && !wellthKeystoreFile.exists()) {
        throw new GradleException("credentials/keystore.properties is missing: a release build must be signed with the private release key, not the debug key.")
    }
}
`;

const SIGNING_RELEASE = `
        // ${MARK}
        release {
            if (wellthKeystoreFile.exists()) {
                storeFile rootProject.file("../credentials/" + wellthKeystore['storeFile'])
                storePassword wellthKeystore['storePassword']
                keyAlias wellthKeystore['keyAlias']
                keyPassword wellthKeystore['keyPassword']
            }
        }`;

function hardenBuildGradle(src) {
  if (src.includes(MARK)) return src;
  let out = src.replace(/\nandroid \{/, `${GRADLE_HEAD}\nandroid {`);
  // signingConfigs { debug { ... } }  ->  add a release config next to it
  out = out.replace(/(signingConfigs \{\s*debug \{[\s\S]*?\n {8}\})/, `$1${SIGNING_RELEASE}`);
  // release build type: private key instead of the debug key
  out = out.replace(
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release'
  );
  // fingerprint(s) the app accepts as its own signature, checked at launch
  out = out.replace(
    /(defaultConfig \{)/,
    `$1\n        buildConfigField "String", "SIGNING_CERT_SHA256", "\\"\${wellthKeystore['certSha256'] ?: ''}\\""`
  );
  if (!out.includes('signingConfigs.release') || !out.includes('SIGNING_CERT_SHA256')) {
    throw new Error('withAppHardening: could not patch android/app/build.gradle (template changed?)');
  }
  return out;
}

const ACTIVITY_METHOD = `
  // ${MARK}: true when this APK is signed with one of the owner's certificates.
  private fun isSignedByOwner(): Boolean {
    val allowed = BuildConfig.SIGNING_CERT_SHA256.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
    if (allowed.isEmpty()) return true
    return try {
      val signers = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val info = packageManager.getPackageInfo(packageName, android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES).signingInfo
        if (info == null) emptyArray() else if (info.hasMultipleSigners()) info.apkContentsSigners else info.signingCertificateHistory
      } else {
        @Suppress("DEPRECATION")
        packageManager.getPackageInfo(packageName, android.content.pm.PackageManager.GET_SIGNATURES).signatures
      } ?: emptyArray()
      signers.any { signer ->
        val digest = java.security.MessageDigest.getInstance("SHA-256").digest(signer.toByteArray())
        digest.joinToString("") { "%02x".format(it) } in allowed
      }
    } catch (e: Exception) {
      false
    }
  }
`;

function hardenMainActivity(src) {
  if (src.includes(MARK)) return src;
  let out = src.replace(
    /(\n\s*)super\.onCreate\(null\)/,
    `$1// ${MARK}: keep money screens out of screenshots, recordings and the recent-apps preview.` +
      `$1if (!BuildConfig.DEBUG) {` +
      `$1  window.setFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE, android.view.WindowManager.LayoutParams.FLAG_SECURE)` +
      `$1}` +
      `$1super.onCreate(null)` +
      `$1// ${MARK}: a copy re-signed with someone else's key refuses to run.` +
      `$1if (!BuildConfig.DEBUG && !isSignedByOwner()) {` +
      `$1  finishAndRemoveTask()` +
      `$1}`
  );
  out = out.replace(/\n(\s*)\/\*\*\s*\n\s*\* Returns the name of the main component/, `\n${ACTIVITY_METHOD}\n$1/**\n$1 * Returns the name of the main component`);
  if (!out.includes('isSignedByOwner()) {') || !out.includes('private fun isSignedByOwner')) {
    throw new Error('withAppHardening: could not patch MainActivity (template changed?)');
  }
  return out;
}

module.exports = function withAppHardening(config) {
  config = withGradleProperties(config, mod => {
    const set = (key, value) => {
      const existing = mod.modResults.find(item => item.type === 'property' && item.key === key);
      if (existing) existing.value = value;
      else mod.modResults.push({ type: 'property', key, value });
    };
    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');
    return mod;
  });
  config = withAppBuildGradle(config, mod => {
    mod.modResults.contents = hardenBuildGradle(mod.modResults.contents);
    return mod;
  });
  return withMainActivity(config, mod => {
    mod.modResults.contents = hardenMainActivity(mod.modResults.contents);
    return mod;
  });
};
